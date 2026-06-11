import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { CheckoutInstructions } from "@/components/checkout-instructions";
import { FileBrowser } from "@/components/file-browser";
import { ReadmeViewer } from "@/components/readme-viewer";
import { HealthStatusBadge } from "@/components/health-status-badge";
import { PipelineStatusBadge } from "@/components/pipeline-status-badge";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { PipelineListResponse, RepositoryDetail, RepositoryTreeResponse } from "@svnhub/shared";
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

  const [repo, tree, pipelines] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryTreeResponse>(
      `/repositories/${slug}/tree?ref=${ref}${revision ? `&revision=${revision}` : ""}`,
    ),
    apiFetch<PipelineListResponse>(`/repositories/${slug}/pipelines`).catch(() => ({
      pipelines: [],
      total: 0,
    })),
  ]);

  const latestPipeline = pipelines.pipelines[0] ?? null;

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          {repo.description ? (
            <p className="text-sm text-muted-foreground">{repo.description}</p>
          ) : null}
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              HEAD r{repo.headRevision} · branch padrão {repo.defaultBranch}
            </span>
            <span className="inline-flex items-center gap-1">
              Saúde
              <HealthStatusBadge status={repo.health.status} />
            </span>
            {latestPipeline ? (
              <Link
                href={`/repos/${slug}/pipelines/${latestPipeline.id}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                CI
                <PipelineStatusBadge status={latestPipeline.status} />
              </Link>
            ) : null}
          </p>
        </div>

        <RepoNav slug={slug} active="code" />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {tree.readme ? <ReadmeViewer content={tree.readme} /> : null}
            <FileBrowser
              slug={slug}
              branchRef={ref}
              path=""
              revision={tree.revision}
              entries={tree.entries}
            />
          </div>
          <CheckoutInstructions
            slug={slug}
            checkoutUrl={repo.checkoutUrl}
            svnUrl={repo.svnUrl}
            branchRef={ref}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Navegue por pastas em{" "}
          <Link href={`/repos/${slug}/tree?ref=${ref}`} className="underline">
            /tree
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
