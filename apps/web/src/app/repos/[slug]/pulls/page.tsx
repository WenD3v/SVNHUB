import Link from "next/link";
import { GitPullRequest } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PullRequestListResponse, RepositoryDetail } from "@svnhub/shared";

interface PullRequestsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}

function getPullRequestPresentation(status: "OPEN" | "MERGED" | "CLOSED") {
  switch (status) {
    case "OPEN":
      return { badgeVariant: "success" as const, label: "Aberto", iconClass: "text-success" };
    case "MERGED":
      return {
        badgeVariant: "brand" as const,
        label: "Mergeado",
        iconClass: "text-[var(--brand-2)]",
        badgeClassName: "text-[var(--brand-2)]",
      };
    case "CLOSED":
      return {
        badgeVariant: "destructive" as const,
        label: "Fechado",
        iconClass: "text-foreground-subtle",
      };
  }
}

export default async function PullRequestsPage({
  params,
  searchParams,
}: PullRequestsPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const statusQuery = query.status ? `?status=${encodeURIComponent(query.status)}` : "";

  const [repo, pullRequests] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<PullRequestListResponse>(`/repositories/${slug}/pull-requests${statusQuery}`),
  ]);

  const filters = [
    { label: "Todos", href: `/repos/${slug}/pulls`, active: !query.status },
    { label: "Abertos", href: `/repos/${slug}/pulls?status=OPEN`, active: query.status === "OPEN" },
    {
      label: "Mergeados",
      href: `/repos/${slug}/pulls?status=MERGED`,
      active: query.status === "MERGED",
    },
    {
      label: "Fechados",
      href: `/repos/${slug}/pulls?status=CLOSED`,
      active: query.status === "CLOSED",
    },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Pull requests</h1>
        </div>

        <RepoNav slug={slug} active="pulls" />

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.label}
              href={filter.href}
              className={cn(
                "inline-flex h-8 items-center rounded-md px-3.5 text-[12.5px] font-semibold transition-colors",
                filter.active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            {pullRequests.pullRequests.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  icon={GitPullRequest}
                  title="Nenhum pull request"
                  description="Nenhum pull request encontrado."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pullRequests.pullRequests.map((pr) => {
                  const presentation = getPullRequestPresentation(pr.status);

                  return (
                    <div
                      key={pr.id}
                      className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-accent/30"
                    >
                      <GitPullRequest
                        className={cn("size-[17px] shrink-0", presentation.iconClass)}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/repos/${slug}/pulls/${pr.number}`}
                          className="text-sm font-semibold text-foreground hover:text-brand"
                        >
                          {pr.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                          <span>
                            <span className="font-mono">#{pr.number}</span>
                            {" · por "}
                            {pr.author.username}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <span className="rounded bg-secondary px-1.5 py-px text-foreground">
                              {pr.sourceRef}
                            </span>
                            <span aria-hidden>→</span>
                            <span className="rounded bg-secondary px-1.5 py-px text-foreground">
                              {pr.targetRef}
                            </span>
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={presentation.badgeVariant}
                        className={cn("shrink-0 font-semibold", presentation.badgeClassName)}
                      >
                        {presentation.label}
                      </Badge>
                      <UserAvatar
                        username={pr.author.username}
                        avatarUrl={pr.author.avatarUrl}
                        className="size-7 shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
