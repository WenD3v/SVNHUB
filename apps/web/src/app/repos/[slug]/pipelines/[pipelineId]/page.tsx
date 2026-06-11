import { AppHeader } from "@/components/app-header";
import { PipelineDetailPanel } from "@/components/pipeline-detail-panel";
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
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Detalhe do pipeline</p>
        </div>

        <RepoNav slug={slug} active="pipelines" />

        <PipelineDetailPanel
          slug={slug}
          pipeline={pipeline}
          initialLogs={initialLogs}
        />
      </section>
    </main>
  );
}
