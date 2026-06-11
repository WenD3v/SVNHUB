import Link from "next/link";

import { CommitActivityChart } from "@/components/commit-activity-chart";
import { FileBrowser } from "@/components/file-browser";
import { PageShell } from "@/components/page-shell";
import { PipelineStatusBadge } from "@/components/pipeline-status-badge";
import { ReadmeViewer } from "@/components/readme-viewer";
import { RepoAboutCard } from "@/components/repo-about-card";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoContributors } from "@/components/repo-contributors";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { resolveReadme } from "@/lib/readme";
import type {
  PipelineListResponse,
  RefListResponse,
  RepositoryActivityResponse,
  RepositoryContributorsResponse,
  RepositoryDetail,
  RepositoryLogResponse,
  RepositoryTreeResponse,
} from "@svnhub/shared";
import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

interface RepoPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; revision?: string }>;
}

export default async function RepoPage({ params, searchParams }: RepoPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const ref = query.ref ?? DEFAULT_BRANCH_UI;
  const revision = query.revision ? Number(query.revision) : undefined;

  const [repo, tree, pipelines, branches, tags, log, activity, contributors] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryTreeResponse>(
      `/repositories/${slug}/tree?ref=${ref}${revision ? `&revision=${revision}` : ""}`,
    ),
    apiFetch<PipelineListResponse>(`/repositories/${slug}/pipelines`).catch(() => ({
      pipelines: [],
      total: 0,
    })),
    apiFetch<RefListResponse>(`/repositories/${slug}/branches`).catch(() => ({ refs: [] })),
    apiFetch<RefListResponse>(`/repositories/${slug}/tags`).catch(() => ({ refs: [] })),
    apiFetch<RepositoryLogResponse>(`/repositories/${slug}/log?limit=1`).catch(() => ({
      entries: [],
      total: 0,
      hasMore: false,
    })),
    apiFetch<RepositoryActivityResponse>(`/repositories/${slug}/stats/activity?weeks=52`).catch(
      () => ({ weeks: [], total: 0 }),
    ),
    apiFetch<RepositoryContributorsResponse>(`/repositories/${slug}/stats/contributors`).catch(
      () => ({ contributors: [] }),
    ),
  ]);

  const readme = resolveReadme(tree);
  const latestPipeline = pipelines.pipelines[0] ?? null;

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{repo.name}</h1>
            {repo.isArchived ? <Badge variant="muted">Arquivado</Badge> : null}
            <Badge variant="outline" className="font-mono">
              r{repo.headRevision}
            </Badge>
            {latestPipeline ? (
              <Link
                href={`/repos/${slug}/pipelines/${latestPipeline.id}`}
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                CI
                <PipelineStatusBadge status={latestPipeline.status} />
              </Link>
            ) : null}
          </div>
        </div>

        <RepoNav slug={slug} active="code" />

        <CommitActivityChart data={activity} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            {readme ? (
              <ReadmeViewer
                content={readme.content}
                format={readme.format}
                filename={readme.filename}
                slug={slug}
                branchRef={ref}
                revision={tree.revision}
              />
            ) : null}
            <FileBrowser
              slug={slug}
              branchRef={ref}
              path=""
              revision={tree.revision}
              entries={tree.entries}
            />
          </div>
          <div className="space-y-4">
            <RepoAboutCard
              slug={slug}
              description={repo.description}
              checkoutUrl={repo.checkoutUrl}
              svnUrl={repo.svnUrl}
              branchRef={ref}
              healthStatus={repo.health.status}
              branchCount={branches.refs.length}
              tagCount={tags.refs.length}
              revisionCount={log.total}
            />
            <RepoContributors slug={slug} contributors={contributors.contributors} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
