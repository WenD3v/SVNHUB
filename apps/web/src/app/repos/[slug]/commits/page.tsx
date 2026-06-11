import { Suspense } from "react";

import { CommitFilters } from "@/components/commit-filters";
import { CommitHistoryPanel } from "@/components/commit-history-panel";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import type { RepositoryDetail, RepositoryLogResponse } from "@svnhub/shared";
import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

interface CommitsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ author?: string; search?: string; ref?: string }>;
}

export default async function CommitsPage({ params, searchParams }: CommitsPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const ref = query.ref ?? DEFAULT_BRANCH_UI;

  const paramsQuery = new URLSearchParams({ ref, limit: "50" });
  if (query.author) paramsQuery.set("author", query.author);
  if (query.search) paramsQuery.set("search", query.search);

  const [repo, log] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryLogResponse>(`/repositories/${slug}/log?${paramsQuery.toString()}`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Commits</h1>
        </div>
        <RepoNav slug={slug} active="commits" />
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <CommitFilters slug={slug} />
        </Suspense>
        <CommitHistoryPanel
          slug={slug}
          initialEntries={log.entries}
          initialHasMore={log.hasMore}
          queryString={paramsQuery.toString()}
        />
      </section>
    </PageShell>
  );
}
