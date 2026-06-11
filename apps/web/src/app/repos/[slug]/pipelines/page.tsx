import { AppHeader } from "@/components/app-header";
import { PipelinesPanel } from "@/components/pipelines-panel";
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
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Pipelines CI/CD</p>
        </div>

        <RepoNav slug={slug} active="pipelines" />

        <PipelinesPanel slug={slug} initial={pipelines} />
      </section>
    </main>
  );
}
