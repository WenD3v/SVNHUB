import { Injectable } from "@nestjs/common";

import {
  parseIssueCloseReferences,
  parseIssueReferences,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import { IssuesService } from "./issues.service";

@Injectable()
export class IssueCrossRefService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly issuesService: IssuesService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async processIndexedRevision(input: {
    repositoryId: string;
    repositorySlug: string;
    revision: number;
    author: string;
    message: string;
  }): Promise<void> {
    const issueNumbers = parseIssueReferences(input.message);
    if (issueNumbers.length === 0) {
      return;
    }

    const authorId = await this.issuesService.findUserIdByUsername(input.author);
    if (!authorId) {
      return;
    }

    for (const issueNumber of issueNumbers) {
      const issue = await this.prisma.issue.findUnique({
        where: {
          repositoryId_number: {
            repositoryId: input.repositoryId,
            number: issueNumber,
          },
        },
      });
      if (!issue) {
        continue;
      }

      const body = `Referenciado no commit [r${input.revision}](/repos/${input.repositorySlug}/commits/${input.revision}):\n\n> ${input.message.trim()}`;

      await this.issuesService.addSystemComment(
        input.repositoryId,
        issueNumber,
        authorId,
        body,
      );

      await this.webhooksService.enqueueDeliveries("ISSUE_COMMENTED", {
        repositoryId: input.repositoryId,
        repositorySlug: input.repositorySlug,
        data: {
          issueNumber,
          authorId,
          revision: input.revision,
          source: "commit_reference",
        },
      });
    }
  }

  async closeIssuesFromPullRequestMerge(input: {
    repositoryId: string;
    repositorySlug: string;
    pullRequestNumber: number;
    targetRef: string;
    defaultBranch: string;
    title: string;
    description: string | null;
    commitMessages: string[];
    actorUserId: string;
  }): Promise<void> {
    if (!this.isDefaultBranchTarget(input.targetRef, input.defaultBranch)) {
      return;
    }

    const textParts = [
      input.title,
      input.description ?? "",
      ...input.commitMessages,
    ];
    const issueNumbers = new Set<number>();
    for (const part of textParts) {
      for (const issueNumber of parseIssueCloseReferences(part)) {
        issueNumbers.add(issueNumber);
      }
    }

    for (const issueNumber of issueNumbers) {
      await this.issuesService.closeByPullRequest(
        input.repositoryId,
        input.repositorySlug,
        issueNumber,
        input.pullRequestNumber,
        input.actorUserId,
      );
    }
  }

  private isDefaultBranchTarget(targetRef: string, defaultBranch: string): boolean {
    const normalizedTarget = targetRef.replace(/^branches\//, "");
    const normalizedDefault = defaultBranch.replace(/^branches\//, "");
    return normalizedTarget === normalizedDefault || normalizedTarget === "main";
  }
}
