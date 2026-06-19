import Link from "next/link";
import { Users } from "lucide-react";

import { AuthorDistributionChart } from "@/components/author-distribution-chart";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { MonthlyTrendChart } from "@/components/monthly-trend-chart";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type {
  RepositoryActivityResponse,
  RepositoryAuthorDistributionResponse,
  RepositoryContributorsResponse,
  RepositoryDetail,
  RepositoryMonthlyActivityResponse,
  UserHeatmapResponse,
} from "@svnhub/shared";

interface InsightsPageProps {
  params: Promise<{ slug: string }>;
}

function activityToHeatmapData(activity: RepositoryActivityResponse): UserHeatmapResponse {
  return {
    total: activity.total,
    days: activity.weeks.map((week) => ({
      date: week.weekStart,
      count: week.count,
    })),
  };
}

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

export default async function InsightsPage({ params }: InsightsPageProps) {
  const { slug } = await params;

  const [repo, activity, monthly, authorDistribution, contributors] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryActivityResponse>(`/repositories/${slug}/stats/activity?weeks=52`).catch(
      () => ({ weeks: [], total: 0 }),
    ),
    apiFetch<RepositoryMonthlyActivityResponse>(`/repositories/${slug}/stats/monthly?months=12`).catch(
      () => ({ months: [], total: 0 }),
    ),
    apiFetch<RepositoryAuthorDistributionResponse>(
      `/repositories/${slug}/stats/author-distribution`,
    ).catch(() => ({ authors: [], total: 0 })),
    apiFetch<RepositoryContributorsResponse>(`/repositories/${slug}/stats/contributors`).catch(
      () => ({ contributors: [] }),
    ),
  ]);

  const maxCommits = Math.max(1, ...contributors.contributors.map((item) => item.commits));
  const heatmapData = activityToHeatmapData(activity);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Atividade e contribuições do repositório nos últimos 52 semanas.
          </p>
        </div>

        <RepoNav slug={slug} active="insights" />

        <div className="grid gap-6 lg:grid-cols-2">
          <ContributionHeatmap
            data={heatmapData}
            title="Atividade de commits"
            subtitle="52 semanas"
            totalLabel={`${activity.total.toLocaleString("pt-BR")} commits no período`}
          />
          <MonthlyTrendChart data={monthly} />
          <AuthorDistributionChart data={authorDistribution} />
          <Card className="overflow-hidden py-0">
            <CardHeader className="flex-row items-center gap-2.5 border-b border-border bg-secondary px-4 py-3 sm:px-5">
              <CardSectionIcon>
                <Users className="size-3.5" aria-hidden />
              </CardSectionIcon>
              <CardTitle>
                {contributors.contributors.length} contribuidor
                {contributors.contributors.length === 1 ? "" : "es"}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {contributors.contributors.map((contributor) => (
                <div
                  key={contributor.author}
                  className="flex items-start gap-3 px-4 py-3 sm:px-5"
                >
                  <UserAvatar username={contributor.author} className="size-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      {contributor.hasProfile ? (
                        <Link
                          href={`/users/${contributor.author}`}
                          className="truncate font-semibold text-foreground hover:text-brand hover:underline"
                        >
                          {contributor.author}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-foreground">
                          {contributor.author}
                        </span>
                      )}
                      <span className="shrink-0 text-muted-foreground">
                        {contributor.commits} commit{contributor.commits === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(contributor.commits / maxCommits) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-foreground-subtle">
                      r{contributor.firstRevision} – r{contributor.lastRevision} · último em{" "}
                      {new Date(contributor.lastDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
