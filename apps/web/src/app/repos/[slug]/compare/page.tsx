import { CompareForm } from "@/components/compare-form";
import { CreatePullRequestForm } from "@/components/create-pull-request-form";
import { DiffViewer } from "@/components/diff-viewer";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Card, CardContent } from "@/components/ui/card";
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
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Compare</h1>
          <p className="text-sm text-muted-foreground">Comparar branches (diff trunk ↔ branch)</p>
        </div>

        <RepoNav slug={slug} active="compare" />

        <CompareForm slug={slug} initialSource={sourceRef} initialTarget={targetRef} />

        {diff ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {diff.sourcePath} → {diff.targetPath} · {diff.files.length} arquivo(s)
            </p>
            <DiffViewer files={diff.files} />
            {targetRef ? (
              <CreatePullRequestForm slug={slug} sourceRef={targetRef} targetRef={sourceRef} />
            ) : null}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Selecione a branch de destino para ver o diff.
            </CardContent>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
