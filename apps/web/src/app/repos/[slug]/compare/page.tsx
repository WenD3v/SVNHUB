import { FileText } from "lucide-react";

import { CompareForm } from "@/components/compare-form";
import { CreatePullRequestForm } from "@/components/create-pull-request-form";
import { DiffViewer } from "@/components/diff-viewer";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { RepositoryDetail, RepositoryDiffResponse, SvnDiffFile } from "@svnhub/shared";

interface ComparePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string; target?: string }>;
}

function countDiffLines(diff?: string): { added: number; removed: number } {
  if (!diff) {
    return { added: 0, removed: 0 };
  }

  let added = 0;
  let removed = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added += 1;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      removed += 1;
    }
  }

  return { added, removed };
}

function summarizeDiff(files: SvnDiffFile[]) {
  return files.reduce(
    (acc, file) => {
      const { added, removed } = countDiffLines(file.diff);
      acc.added += added;
      acc.removed += removed;
      return acc;
    },
    { added: 0, removed: 0 },
  );
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

  const totals = diff ? summarizeDiff(diff.files) : null;

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Compare</h1>
          <p className="text-sm text-muted-foreground">Comparar branches (diff trunk ↔ branch)</p>
        </div>

        <RepoNav slug={slug} active="compare" />

        <CompareForm slug={slug} initialSource={sourceRef} initialTarget={targetRef} />

        {diff ? (
          <div className="space-y-4">
            <Card className="overflow-hidden py-0">
              <CardContent className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-3.5 text-[12.5px] text-muted-foreground">
                <span className="font-mono text-foreground">
                  {sourceRef} ← {targetRef}
                </span>
                <span>· {diff.files.length} arquivo(s)</span>
                {totals ? (
                  <span className="ml-auto flex items-center gap-2 font-mono font-semibold">
                    {totals.added > 0 ? (
                      <span className="text-success">+{totals.added}</span>
                    ) : null}
                    {totals.removed > 0 ? (
                      <span className="text-destructive">−{totals.removed}</span>
                    ) : null}
                  </span>
                ) : null}
              </CardContent>
              <CardContent className="divide-y divide-border p-0">
                {diff.files.map((file) => {
                  const { added, removed } = countDiffLines(file.diff);
                  const maxBar = Math.max(added, removed, 1);

                  return (
                    <div
                      key={file.path}
                      className="flex items-center gap-3 px-5 py-2.5"
                    >
                      <FileText className="size-3.5 shrink-0 text-foreground-subtle" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
                        {file.path}
                      </span>
                      {added > 0 ? (
                        <span className="font-mono text-[11.5px] text-success">+{added}</span>
                      ) : null}
                      {removed > 0 ? (
                        <span className="font-mono text-[11.5px] text-destructive">−{removed}</span>
                      ) : null}
                      <div className="flex h-2 w-14 shrink-0 gap-0.5">
                        {added > 0 ? (
                          <div
                            className="h-full rounded-sm bg-success"
                            style={{ width: `${(added / maxBar) * 100}%` }}
                          />
                        ) : null}
                        {removed > 0 ? (
                          <div
                            className="h-full rounded-sm bg-destructive"
                            style={{ width: `${(removed / maxBar) * 100}%` }}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <DiffViewer files={diff.files} />

            {targetRef ? (
              <CreatePullRequestForm slug={slug} sourceRef={targetRef} targetRef={sourceRef} />
            ) : null}
          </div>
        ) : (
          <Card className="overflow-hidden py-0">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Selecione a branch de destino para ver o diff.
            </CardContent>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
