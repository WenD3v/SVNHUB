import { Injectable } from "@nestjs/common";
import type {
  NotificationPayload,
  NotificationsResponse,
  NotificationSummary,
  NotificationType,
} from "@svnhub/shared";

import { AuditService } from "../audit/audit.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  async list(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<NotificationsResponse> {
    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      items: rows.map((row) => this.toSummary(row)),
      unreadCount,
      total,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationSummary> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) {
      throw new Error("Notification not found");
    }

    const row = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: existing.readAt ?? new Date() },
    });

    await this.auditService.log({
      userId,
      action: "notification.read",
      resourceType: "notification",
      resourceId: notificationId,
    });

    return this.toSummary(row);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count > 0) {
      await this.auditService.log({
        userId,
        action: "notification.read_all",
        resourceType: "notification",
        metadata: { updated: result.count },
      });
    }

    return { updated: result.count };
  }

  async notifyPrReviewRequested(input: {
    repositoryId: string;
    repositorySlug: string;
    pullRequestNumber: number;
    pullRequestTitle: string;
    authorId: string;
    authorUsername: string;
  }): Promise<void> {
    const reviewerIds = await this.findEligiblePrReviewers(
      input.repositoryId,
      input.authorId,
      input.pullRequestNumber,
    );

    await this.createMany(
      reviewerIds.map((userId) => ({
        userId,
        type: "PR_REVIEW_REQUESTED" as const,
        payload: {
          repositorySlug: input.repositorySlug,
          pullRequestNumber: input.pullRequestNumber,
          pullRequestTitle: input.pullRequestTitle,
          authorUsername: input.authorUsername,
        },
      })),
    );
  }

  async notifyIssueAssigned(input: {
    repositorySlug: string;
    issueNumber: number;
    issueTitle: string;
    assigneeId: string;
    assignerId: string;
    assignerUsername: string;
  }): Promise<void> {
    if (input.assigneeId === input.assignerId) {
      return;
    }

    await this.create({
      userId: input.assigneeId,
      type: "ISSUE_ASSIGNED",
      payload: {
        repositorySlug: input.repositorySlug,
        issueNumber: input.issueNumber,
        issueTitle: input.issueTitle,
        assignerUsername: input.assignerUsername,
      },
    });
  }

  async notifyPipelineFailed(input: {
    repositoryId: string;
    repositorySlug: string;
    pipelineId: string;
    branchPath: string;
    revision: number;
  }): Promise<void> {
    const maintainerIds = await this.findRepoMaintainers(input.repositoryId);
    await this.createMany(
      maintainerIds.map((userId) => ({
        userId,
        type: "PIPELINE_FAILED" as const,
        payload: {
          repositorySlug: input.repositorySlug,
          pipelineId: input.pipelineId,
          branchPath: input.branchPath,
          revision: input.revision,
        },
      })),
    );
  }

  async notifyMentions(input: {
    repositorySlug: string;
    context: "pull_request" | "issue";
    contextNumber: number;
    contextTitle: string;
    commentId: string;
    authorId: string;
    authorUsername: string;
    body: string;
  }): Promise<void> {
    const mentionedUsernames = [...new Set(input.body.match(/@([a-zA-Z0-9_-]+)/g)?.map((token) => token.slice(1)) ?? [])];
    if (mentionedUsernames.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: {
        username: { in: mentionedUsernames },
        isActive: true,
      },
      select: { id: true, username: true, email: true },
    });

    const excerpt = input.body.trim().slice(0, 160);
    await this.createMany(
      users
        .filter((user) => user.id !== input.authorId)
        .map((user) => ({
          userId: user.id,
          type: "MENTION" as const,
          payload: {
            repositorySlug: input.repositorySlug,
            context: input.context,
            contextNumber: input.contextNumber,
            contextTitle: input.contextTitle,
            commentId: input.commentId,
            authorUsername: input.authorUsername,
            excerpt,
          },
        })),
    );

    await Promise.all(
      users
        .filter((user) => user.id !== input.authorId)
        .map((user) =>
          this.emailService.sendMentionEmail({
            email: user.email,
            username: user.username,
            authorUsername: input.authorUsername,
            repositorySlug: input.repositorySlug,
            context: input.context,
            contextNumber: input.contextNumber,
            excerpt,
          }),
        ),
    );
  }

  private async create(input: {
    userId: string;
    type: NotificationType;
    payload: NotificationPayload;
  }): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        payload: input.payload as object,
      },
    });
  }

  private async createMany(
    items: Array<{
      userId: string;
      type: NotificationType;
      payload: NotificationPayload;
    }>,
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    await this.prisma.notification.createMany({
      data: items.map((item) => ({
        userId: item.userId,
        type: item.type,
        payload: item.payload as object,
      })),
    });
  }

  private async findEligiblePrReviewers(
    repositoryId: string,
    authorId: string,
    pullRequestNumber: number,
  ): Promise<string[]> {
    const pullRequest = await this.prisma.pullRequest.findFirst({
      where: { repositoryId, number: pullRequestNumber },
      select: { id: true },
    });
    if (!pullRequest) {
      return [];
    }

    const directMembers = await this.prisma.repoMember.findMany({
      where: {
        repositoryId,
        userId: { not: authorId },
        role: { in: ["DEVELOPER", "MAINTAINER", "OWNER"] },
      },
      select: { userId: true },
    });

    const teamLinks = await this.prisma.repoTeam.findMany({
      where: {
        repositoryId,
        role: { in: ["DEVELOPER", "MAINTAINER", "OWNER"] },
      },
      select: { groupId: true },
    });

    const teamMembers =
      teamLinks.length > 0
        ? await this.prisma.groupMember.findMany({
            where: {
              groupId: { in: teamLinks.map((entry) => entry.groupId) },
              userId: { not: authorId },
            },
            select: { userId: true },
          })
        : [];

    const candidateIds = [...new Set([
      ...directMembers.map((entry) => entry.userId),
      ...teamMembers.map((entry) => entry.userId),
    ])];

    if (candidateIds.length === 0) {
      return [];
    }

    const existingReviews = await this.prisma.pRReview.findMany({
      where: {
        pullRequestId: pullRequest.id,
        authorId: { in: candidateIds },
      },
      select: { authorId: true },
    });
    const reviewedIds = new Set(existingReviews.map((entry) => entry.authorId));

    return candidateIds.filter((userId) => !reviewedIds.has(userId));
  }

  private async findRepoMaintainers(repositoryId: string): Promise<string[]> {
    const directMembers = await this.prisma.repoMember.findMany({
      where: {
        repositoryId,
        role: { in: ["MAINTAINER", "OWNER"] },
      },
      select: { userId: true },
    });

    const teamLinks = await this.prisma.repoTeam.findMany({
      where: {
        repositoryId,
        role: { in: ["MAINTAINER", "OWNER"] },
      },
      select: { groupId: true },
    });

    const teamMembers =
      teamLinks.length > 0
        ? await this.prisma.groupMember.findMany({
            where: { groupId: { in: teamLinks.map((entry) => entry.groupId) } },
            select: { userId: true },
          })
        : [];

    return [...new Set([
      ...directMembers.map((entry) => entry.userId),
      ...teamMembers.map((entry) => entry.userId),
    ])];
  }

  private toSummary(row: {
    id: string;
    type: NotificationType;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationSummary {
    return {
      id: row.id,
      type: row.type,
      payload: row.payload as NotificationPayload,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    } as NotificationSummary;
  }
}
