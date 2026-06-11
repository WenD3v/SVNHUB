import { CommitActivityChart } from "@/components/commit-activity-chart";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type {
  RepositoryActivityResponse,
  RepositoryContributorsResponse,
  RepositoryDetail,
} from "@svnhub/shared";

interface InsightsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function InsightsPage({ params }: InsightsPageProps) {
  const { slug } = await params;

  const [repo, activity, contributors] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryActivityResponse>(`/repositories/${slug}/stats/activity?weeks=52`).catch(
      () => ({ weeks: [], total: 0 }),
    ),
    apiFetch<RepositoryContributorsResponse>(`/repositories/${slug}/stats/contributors`).catch(
      () => ({ contributors: [] }),
    ),
  ]);

  const maxCommits = Math.max(1, ...contributors.contributors.map((item) => item.commits));

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Atividade e contribuições do repositório nos últimos 52 semanas.
          </p>
        </div>

        <RepoNav slug={slug} active="insights" />

        <div className="grid gap-6 lg:grid-cols-2">
          <CommitActivityChart data={activity} />
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-base font-semibold">
                  {contributors.contributors.length} contributor
                  {contributors.contributors.length === 1 ? "" : "s"}
                </h2>
              </div>
              <div className="divide-y divide-border">
                {contributors.contributors.map((contributor) => (
                  <div key={contributor.author} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="size-8">
                      <AvatarFallback username={contributor.author} />
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{contributor.author}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {contributor.commits} commit{contributor.commits === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(contributor.commits / maxCommits) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        r{contributor.firstRevision} – r{contributor.lastRevision} · último em{" "}
                        {new Date(contributor.lastDate).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
