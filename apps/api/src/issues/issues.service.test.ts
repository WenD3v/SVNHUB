import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

import { IssueCrossRefService } from "./issue-cross-ref.service";
import type { IssuesService } from "./issues.service";

describe("IssueCrossRefService", () => {
  it("closes issues referenced with fixes #N when merging to default branch", async () => {
    const closeByPullRequest = vi.fn().mockResolvedValue(undefined);
    const issuesService = {
      closeByPullRequest,
      findUserIdByUsername: vi.fn(),
      addSystemComment: vi.fn(),
    } as unknown as IssuesService;

    const prisma = {
      issue: {
        findUnique: vi.fn(),
      },
    };

    const webhooksService = {
      enqueueDeliveries: vi.fn(),
    };

    const service = new IssueCrossRefService(
      prisma as never,
      issuesService,
      webhooksService as never,
    );

    await service.closeIssuesFromPullRequestMerge({
      repositoryId: "repo-1",
      repositorySlug: "demo",
      pullRequestNumber: 4,
      targetRef: "main",
      defaultBranch: "main",
      title: "Fix login",
      description: "fixes #7 and closes #9",
      commitMessages: ["Also resolves #11"],
      actorUserId: "user-1",
    });

    expect(closeByPullRequest).toHaveBeenCalledTimes(3);
    expect(closeByPullRequest).toHaveBeenCalledWith(
      "repo-1",
      "demo",
      7,
      4,
      "user-1",
    );
    expect(closeByPullRequest).toHaveBeenCalledWith(
      "repo-1",
      "demo",
      9,
      4,
      "user-1",
    );
    expect(closeByPullRequest).toHaveBeenCalledWith(
      "repo-1",
      "demo",
      11,
      4,
      "user-1",
    );
  });

  it("ignores closing keywords when target branch is not default", async () => {
    const closeByPullRequest = vi.fn().mockResolvedValue(undefined);
    const issuesService = {
      closeByPullRequest,
      findUserIdByUsername: vi.fn(),
      addSystemComment: vi.fn(),
    } as unknown as IssuesService;

    const service = new IssueCrossRefService({} as never, issuesService, {} as never);

    await service.closeIssuesFromPullRequestMerge({
      repositoryId: "repo-1",
      repositorySlug: "demo",
      pullRequestNumber: 2,
      targetRef: "feature/x",
      defaultBranch: "main",
      title: "fixes #3",
      description: null,
      commitMessages: [],
      actorUserId: "user-1",
    });

    expect(closeByPullRequest).not.toHaveBeenCalled();
  });
});

describe("IssuesService concurrent numbering", () => {
  it("retries when unique constraint conflicts on issue number", async () => {
    const { IssuesService } = await import("./issues.service");

    let createAttempts = 0;
    const prisma = {
      issue: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({ _max: { number: 1 } })
          .mockResolvedValueOnce({ _max: { number: 2 } }),
        create: vi.fn().mockImplementation(() => {
          createAttempts += 1;
          if (createAttempts === 1) {
            throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
              code: "P2002",
              clientVersion: "test",
            });
          }
          return {
            id: "issue-3",
            number: 3,
            repositoryId: "repo-1",
            title: "Bug",
            body: null,
            status: "OPEN",
            authorId: "user-1",
            assigneeId: null,
            closedAt: null,
            closedByPrNumber: null,
            createdAt: new Date("2026-06-11T10:00:00.000Z"),
            updatedAt: new Date("2026-06-11T10:00:00.000Z"),
            author: {
              id: "user-1",
              username: "dev",
              displayName: "Dev",
              avatarUrl: null,
            },
            assignee: null,
            labels: [],
            comments: [],
          };
        }),
      },
      repository: {
        findUnique: vi.fn().mockResolvedValue({ id: "repo-1", slug: "demo" }),
      },
      repoMember: { findFirst: vi.fn() },
      label: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const auditService = { log: vi.fn() };
    const webhooksService = { enqueueDeliveries: vi.fn() };

    const service = new IssuesService(
      prisma as never,
      auditService as never,
      webhooksService as never,
    );

    const result = await service.create(
      "demo",
      { title: "Bug" },
      "user-1",
    );

    expect(result.number).toBe(3);
    expect(prisma.issue.create).toHaveBeenCalledTimes(2);
  });
});
