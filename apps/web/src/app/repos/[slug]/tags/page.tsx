import { Tag as TagIcon } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { CreateRefForm, DeleteRefButton } from "@/components/ref-manager";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api";
import type { RefListResponse, RepositoryDetail } from "@svnhub/shared";

interface TagsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { slug } = await params;

  const [repo, tags] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RefListResponse>(`/repositories/${slug}/tags`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Releases</h1>
          <p className="text-[12.5px] text-muted-foreground">
            Tags ·{" "}
            <code className="rounded bg-secondary px-1.5 py-px font-mono text-foreground">/tags/*</code>
          </p>
        </div>

        <RepoNav slug={slug} active="tags" />

        <CreateRefForm slug={slug} kind="tag" />

        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <div className="grid grid-cols-[1.7fr_1fr_0.9fr_0.9fr_44px] gap-3 border-b border-border bg-secondary px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Tag</span>
              <span>Criada</span>
              <span>Revisão</span>
              <span>Autor</span>
              <span className="sr-only">Ações</span>
            </div>
            {tags.refs.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  icon={TagIcon}
                  title="Nenhuma tag"
                  description="Nenhuma tag criada."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tags.refs.map((ref) => (
                  <div
                    key={ref.name}
                    className="grid grid-cols-[1.7fr_1fr_0.9fr_0.9fr_44px] items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TagIcon className="size-3.5 shrink-0 text-brand" aria-hidden />
                        <span className="font-mono text-[13px] font-semibold text-foreground">
                          {ref.name}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-foreground-subtle">
                        {ref.svnPath}
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-xs text-foreground">r{ref.createdRevision}</span>
                      <p className="text-[10.5px] text-foreground-subtle">{ref.createdAuthor}</p>
                    </div>
                    <span className="font-mono text-xs text-foreground">r{ref.lastChangedRevision}</span>
                    <span className="text-xs text-muted-foreground">{ref.lastChangedAuthor}</span>
                    <div className="text-right">
                      <DeleteRefButton slug={slug} name={ref.name} kind="tag" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
