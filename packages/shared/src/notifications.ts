export type NotificationType =
  | "PR_REVIEW_REQUESTED"
  | "ISSUE_ASSIGNED"
  | "PIPELINE_FAILED"
  | "MENTION";

export interface NotificationPrReviewPayload {
  repositorySlug: string;
  pullRequestNumber: number;
  pullRequestTitle: string;
  authorUsername: string;
}

export interface NotificationIssueAssignedPayload {
  repositorySlug: string;
  issueNumber: number;
  issueTitle: string;
  assignerUsername: string;
}

export interface NotificationPipelineFailedPayload {
  repositorySlug: string;
  pipelineId: string;
  branchPath: string;
  revision: number;
}

export interface NotificationMentionPayload {
  repositorySlug: string;
  context: "pull_request" | "issue";
  contextNumber: number;
  contextTitle: string;
  commentId: string;
  authorUsername: string;
  excerpt: string;
}

export type NotificationPayload =
  | NotificationPrReviewPayload
  | NotificationIssueAssignedPayload
  | NotificationPipelineFailedPayload
  | NotificationMentionPayload;

export type NotificationSummary =
  | {
      id: string;
      type: "PR_REVIEW_REQUESTED";
      payload: NotificationPrReviewPayload;
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: "ISSUE_ASSIGNED";
      payload: NotificationIssueAssignedPayload;
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: "PIPELINE_FAILED";
      payload: NotificationPipelineFailedPayload;
      readAt: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: "MENTION";
      payload: NotificationMentionPayload;
      readAt: string | null;
      createdAt: string;
    };

export interface NotificationsResponse {
  items: NotificationSummary[];
  unreadCount: number;
  total: number;
}

export const MENTION_USERNAME_PATTERN = /@([a-zA-Z0-9_-]+)/g;

export function extractMentionedUsernames(body: string): string[] {
  const matches = body.matchAll(MENTION_USERNAME_PATTERN);
  const usernames = new Set<string>();
  for (const match of matches) {
    const username = match[1];
    if (username) {
      usernames.add(username);
    }
  }
  return [...usernames];
}
