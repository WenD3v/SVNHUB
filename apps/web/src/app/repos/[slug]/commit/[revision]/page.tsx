import { CommitDetailHeader } from "@/components/commit-detail-header";
import { CommitFileList } from "@/components/commit-file-list";
import { DiffViewer } from "@/components/diff-viewer";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { RepositoryDetail, RepositoryDiffResponse, RepositoryLogResponse } from "@svnhub/shared";

interface CommitPageProps {
  params: Promise<{ slug: string; revision: string }>;
}

export default async function CommitPage({ params }: CommitPageProps) {
  const { slug, revision } = await params;
  const rev = Number(revision);

  const [repo, diff, log, prevLog, nextLog] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryDiffResponse>(`/repositories/${slug}/revisions/${rev}`),
    apiFetch<RepositoryLogResponse>(`/repositories/${slug}/log?revision=${rev}&limit=1`),
    rev > 1
      ? apiFetch<RepositoryLogResponse>(
          `/repositories/${slug}/log?revision=1:${rev - 1}&limit=1`,
        ).catch(() => ({ entries: [], total: 0, hasMore: false }))
      : Promise.resolve({ entries: [], total: 0, hasMore: false }),
    apiFetch<RepositoryLogResponse>(
      `/repositories/${slug}/log?revision=${rev + 1}:999999&limit=1`,
    ).catch(() => ({ entries: [], total: 0, hasMore: false })),
  ]);

  const entry = log.entries[0];
  const previousRevision = prevLog.entries[0]?.revision ?? null;
  const nextRevision = nextLog.entries[0]?.revision ?? null;

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <CommitDetailHeader
            slug={slug}
            revision={rev}
            entry={entry}
            previousRevision={previousRevision}
            nextRevision={nextRevision}
          />
        </div>
        <RepoNav slug={slug} active="commits" />
        <CommitFileList files={diff.files} />
        <DiffViewer files={diff.files} />
      </section>
    </PageShell>
  );
}
