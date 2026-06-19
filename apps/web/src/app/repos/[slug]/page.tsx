import Link from "next/link";
import {
  Check,
  Eye,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  Tag,
} from "lucide-react";

import { CommitActivityChart } from "@/components/commit-activity-chart";
import { CheckoutDialogButton } from "@/components/checkout-instructions";
import { FileBrowser } from "@/components/file-browser";
import { PageShell } from "@/components/page-shell";
import { ReadmeViewer } from "@/components/readme-viewer";
import { RepoAboutCard } from "@/components/repo-about-card";
import { RepoContributors } from "@/components/repo-contributors";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const latestCommit = log.entries[0] ?? null;
  const ciPassed = latestPipeline?.status === "SUCCESS";

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-display text-lg tracking-tight">
              <FolderGit2 className="size-[18px] shrink-0 text-foreground-subtle" aria-hidden />
              <Link href={`/repos/${slug}`} className="font-medium text-brand hover:underline">
                {slug}
              </Link>
              <span className="text-foreground-subtle">/</span>
              <span className="font-bold text-foreground">{repo.name}</span>
              <Badge variant="outline" className="ml-1 text-[11px] font-semibold">
                Privado
              </Badge>
              {repo.isArchived ? (
                <Badge variant="muted" className="text-[11px]">Arquivado</Badge>
              ) : null}
            </div>
            {repo.description ? (
              <p className="mt-2.5 max-w-[560px] text-sm leading-relaxed text-muted-foreground">
                {repo.description}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" type="button" className="h-[34px] px-3 text-[13px] font-semibold">
              <Eye className="size-3.5" />
              Observar
            </Button>
            <CheckoutDialogButton
              slug={slug}
              checkoutUrl={repo.checkoutUrl}
              svnUrl={repo.svnUrl}
              branchRef={ref}
              className="h-[34px] px-3.5 text-[13px] font-semibold"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <GitBranch className="size-3.5" aria-hidden />
            {branches.refs.length} branches
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Tag className="size-3.5" aria-hidden />
            {tags.refs.length} tags
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono">
            <GitCommitHorizontal className="size-3.5" aria-hidden />
            r{repo.headRevision} · {log.total.toLocaleString("pt-BR")} revisões
          </span>
          {latestPipeline ? (
            <Link
              href={`/repos/${slug}/pipelines/${latestPipeline.id}`}
              className={
                ciPassed
                  ? "inline-flex items-center gap-1.5 font-semibold text-success hover:underline"
                  : "inline-flex items-center gap-1.5 hover:underline"
              }
            >
              {ciPassed ? <Check className="size-3.5" aria-hidden /> : null}
              {ciPassed ? "CI passou" : `CI · ${latestPipeline.status}`}
            </Link>
          ) : null}
        </div>

        <RepoNav slug={slug} active="code" />

        <CommitActivityChart data={activity} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <FileBrowser
              slug={slug}
              repoName={repo.name}
              branchRef={ref}
              path=""
              revision={tree.revision}
              entries={tree.entries}
              branches={branches.refs}
              latestCommit={latestCommit}
            />
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
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-[7.75rem] lg:self-start">
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
