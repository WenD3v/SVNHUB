import Link from "next/link";
import { Check, GitPullRequest } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardPullRequestSummary } from "@svnhub/shared";

interface DashboardPullRequestsProps {
  authoredOpenPullRequests: DashboardPullRequestSummary[];
  reviewRequestedPullRequests: DashboardPullRequestSummary[];
}

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

function PullRequestList({
  title,
  pullRequests,
  emptyDescription,
  showAuthor = false,
  icon,
  countBadge,
}: {
  title: string;
  pullRequests: DashboardPullRequestSummary[];
  emptyDescription: string;
  showAuthor?: boolean;
  icon: React.ReactNode;
  countBadge?: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2.5 pb-3">
        <CardSectionIcon>{icon}</CardSectionIcon>
        <CardTitle>{title}</CardTitle>
        {countBadge !== undefined && countBadge > 0 ? (
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-primary-foreground">
            {countBadge}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {pullRequests.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={GitPullRequest}
              title="Nenhum pull request"
              description={emptyDescription}
              className="py-4"
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pullRequests.map((pullRequest) => (
              <div key={pullRequest.id} className="px-5 py-3">
                <Link
                  href={`/repos/${pullRequest.repositorySlug}/pulls/${pullRequest.number}`}
                  className="block text-[13.5px] font-semibold text-foreground hover:text-brand"
                >
                  {pullRequest.title}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-muted-foreground">
                  <span>
                    {pullRequest.repositoryName} #{pullRequest.number}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="rounded bg-secondary px-1.5 py-px">
                      {pullRequest.sourceRef}
                    </span>
                    <span aria-hidden>→</span>
                    <span className="rounded bg-secondary px-1.5 py-px">
                      {pullRequest.targetRef}
                    </span>
                  </span>
                </div>
                {showAuthor ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
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
        title="Seus PRs abertos"
        pullRequests={authoredOpenPullRequests}
        emptyDescription="Você não tem pull requests abertos no momento."
        icon={<GitPullRequest className="size-3.5" aria-hidden />}
      />
      <PullRequestList
        title="Aguardando seu review"
        pullRequests={reviewRequestedPullRequests}
        emptyDescription="Nenhum pull request aguardando sua revisão."
        showAuthor
        countBadge={reviewRequestedPullRequests.length}
        icon={<Check className="size-3.5" aria-hidden />}
      />
    </div>
  );
}
