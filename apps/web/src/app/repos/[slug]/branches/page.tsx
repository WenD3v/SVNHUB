import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { CreateRefForm, DeleteRefButton } from "@/components/ref-manager";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { RefListResponse, RepositoryDetail } from "@svnhub/shared";

interface BranchesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BranchesPage({ params }: BranchesPageProps) {
  const { slug } = await params;

  const [repo, branches] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RefListResponse>(`/repositories/${slug}/branches`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Branches</h1>
          <p className="text-[12.5px] text-muted-foreground">
            <code className="rounded bg-secondary px-1.5 py-px font-mono text-foreground">main</code>
            {" = "}
            <code className="rounded bg-secondary px-1.5 py-px font-mono text-foreground">/trunk</code>
          </p>
        </div>

        <RepoNav slug={slug} active="branches" />

        <CreateRefForm slug={slug} kind="branch" />

        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <div className="grid grid-cols-[1.7fr_1fr_0.9fr_0.9fr_44px] gap-3 border-b border-border bg-secondary px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Nome</span>
              <span>Criada</span>
              <span>Último commit</span>
              <span>Autor</span>
              <span className="sr-only">Ações</span>
            </div>
            <div className="divide-y divide-border">
              {branches.refs.map((ref) => (
                <div
                  key={ref.name}
                  className="grid grid-cols-[1.7fr_1fr_0.9fr_0.9fr_44px] items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/repos/${slug}?ref=${ref.name}`}
                        className="font-mono text-[13px] font-semibold text-brand hover:underline"
                      >
                        {ref.name}
                      </Link>
                      {ref.isDefault ? (
                        <Badge variant="brand" className="text-[10px]">
                          default
                        </Badge>
                      ) : null}
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
                    {!ref.isDefault ? (
                      <DeleteRefButton slug={slug} name={ref.name} kind="branch" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
