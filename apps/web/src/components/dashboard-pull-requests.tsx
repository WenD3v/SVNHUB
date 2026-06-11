import Link from "next/link";
import { GitPullRequest } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardPullRequestSummary } from "@svnhub/shared";

interface DashboardPullRequestsProps {
  authoredOpenPullRequests: DashboardPullRequestSummary[];
  reviewRequestedPullRequests: DashboardPullRequestSummary[];
}

function PullRequestList({
  title,
  pullRequests,
  emptyDescription,
  showAuthor = false,
}: {
  title: string;
  pullRequests: DashboardPullRequestSummary[];
  emptyDescription: string;
  showAuthor?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {pullRequests.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title="Nenhum pull request"
            description={emptyDescription}
            className="py-4"
          />
        ) : (
          <div className="divide-y divide-border">
            {pullRequests.map((pullRequest) => (
              <div key={pullRequest.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/repos/${pullRequest.repositorySlug}/pulls/${pullRequest.number}`}
                  className="font-medium text-primary hover:underline"
                >
                  {pullRequest.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pullRequest.repositoryName} · #{pullRequest.number} ·{" "}
                  {pullRequest.sourceRef} → {pullRequest.targetRef}
                </p>
                {showAuthor ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    por {pullRequest.authorDisplayName ?? pullRequest.authorUsername}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPullRequests({
  authoredOpenPullRequests,
  reviewRequestedPullRequests,
}: DashboardPullRequestsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PullRequestList
        title="Seus pull requests abertos"
        pullRequests={authoredOpenPullRequests}
        emptyDescription="Você não tem pull requests abertos no momento."
      />
      <PullRequestList
        title="Aguardando seu review"
        pullRequests={reviewRequestedPullRequests}
        emptyDescription="Nenhum pull request aguardando sua revisão."
        showAuthor
      />
    </div>
  );
}
