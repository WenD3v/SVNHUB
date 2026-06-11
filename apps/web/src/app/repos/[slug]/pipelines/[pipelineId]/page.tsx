import { PageShell } from "@/components/page-shell";
import { PipelineDetailPanel } from "@/components/pipeline-detail-panel";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { JobLogChunk, PipelineDetail, RepositoryDetail } from "@svnhub/shared";

interface PipelineDetailPageProps {
  params: Promise<{ slug: string; pipelineId: string }>;
}

export default async function PipelineDetailPage({ params }: PipelineDetailPageProps) {
  const { slug, pipelineId } = await params;

  const [repo, pipeline] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<PipelineDetail>(`/repositories/${slug}/pipelines/${pipelineId}`),
  ]);

  const initialLogs: Record<string, JobLogChunk[]> = {};
  await Promise.all(
    pipeline.jobs.map(async (job) => {
      initialLogs[job.id] = await apiFetch<JobLogChunk[]>(
        `/repositories/${slug}/pipelines/${pipelineId}/jobs/${job.id}/logs`,
      );
    }),
  );

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Pipeline r{pipeline.revision}</h1>
        </div>

        <RepoNav slug={slug} active="pipelines" />

        <PipelineDetailPanel slug={slug} pipeline={pipeline} initialLogs={initialLogs} />
      </section>
    </PageShell>
  );
}
