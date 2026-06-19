import { PageShell } from "@/components/page-shell";
import { PipelinesPanel } from "@/components/pipelines-panel";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { PipelineListResponse, RepositoryDetail } from "@svnhub/shared";

interface PipelinesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PipelinesPage({ params }: PipelinesPageProps) {
  const { slug } = await params;

  const [repo, pipelines] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<PipelineListResponse>(`/repositories/${slug}/pipelines`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Pipelines</h1>
        </div>

        <RepoNav slug={slug} active="pipelines" />

        <PipelinesPanel slug={slug} initial={pipelines} />
      </section>
    </PageShell>
  );
}
