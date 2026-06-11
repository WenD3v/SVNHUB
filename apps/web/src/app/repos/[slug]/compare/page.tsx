import { AppHeader } from "@/components/app-header";
import { DiffViewer } from "@/components/diff-viewer";
import { CompareForm } from "@/components/compare-form";
import { CreatePullRequestForm } from "@/components/create-pull-request-form";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { RepositoryDetail, RepositoryDiffResponse } from "@svnhub/shared";

interface ComparePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; target?: string }>;
}

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const sourceRef = query.source ?? "main";
  const targetRef = query.target ?? "";

  const repo = await apiFetch<RepositoryDetail>(`/repositories/${slug}`);

  let diff: RepositoryDiffResponse | null = null;
  if (targetRef) {
    diff = await apiFetch<RepositoryDiffResponse>(
      `/repositories/${slug}/compare?sourceRef=${encodeURIComponent(sourceRef)}&targetRef=${encodeURIComponent(targetRef)}`,
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Comparar branches (diff trunk ↔ branch)</p>
        </div>

        <RepoNav slug={slug} active="compare" />

        <CompareForm slug={slug} initialSource={sourceRef} initialTarget={targetRef} />

        {diff ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {diff.sourcePath} → {diff.targetPath} · {diff.files.length} arquivo(s)
              </p>
              <DiffViewer files={diff.files} />
            </div>
            {targetRef ? (
              <CreatePullRequestForm slug={slug} sourceRef={targetRef} targetRef={sourceRef} />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione a branch de destino para ver o diff.
          </p>
        )}
      </section>
    </main>
  );
}
