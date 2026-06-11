import { Suspense } from "react";

import { AppHeader } from "@/components/app-header";
import { CommitFilters } from "@/components/commit-filters";
import { CommitHistory } from "@/components/commit-history";
import { RepoNav } from "@/components/repo-nav";
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
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">{repo.name}</h1>
        <RepoNav slug={slug} active="commits" />
        <Suspense>
          <CommitFilters slug={slug} />
        </Suspense>
        <CommitHistory slug={slug} entries={log.entries} />
      </section>
    </main>
  );
}
