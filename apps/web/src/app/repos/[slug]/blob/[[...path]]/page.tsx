import Link from "next/link";

import { CodeViewer } from "@/components/code-viewer";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { extensionToLanguage, joinPathSegments } from "@/lib/paths";
import type { RepositoryDetail, RepositoryFileContentResponse } from "@svnhub/shared";
import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

interface BlobPageProps {
  params: Promise<{ slug: string; path: string[] }>;
  searchParams: Promise<{ ref?: string; revision?: string }>;
}

export default async function BlobPage({ params, searchParams }: BlobPageProps) {
  const { slug, path } = await params;
  const query = await searchParams;
  const uiPath = joinPathSegments(path);
  const ref = query.ref ?? DEFAULT_BRANCH_UI;
  const revision = query.revision ? Number(query.revision) : undefined;

  const [repo, file] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryFileContentResponse>(
      `/repositories/${slug}/content?ref=${ref}&path=${encodeURIComponent(uiPath)}${revision ? `&revision=${revision}` : ""}`,
    ),
  ]);

  const parentPath = uiPath.split("/").slice(0, -1).join("/");

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <RepoBreadcrumbs slug={slug} repoName={repo.name} path={uiPath} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/repos/${slug}/blame/${uiPath}?ref=${ref}`}>Blame</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={
                parentPath
                  ? `/repos/${slug}/tree/${parentPath}?ref=${ref}`
                  : `/repos/${slug}?ref=${ref}`
              }
            >
              Voltar
            </Link>
          </Button>
        </div>
        <RepoNav slug={slug} active="code" />
        {file.isBinary ? (
          <Card className="py-0">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Arquivo binário ({file.size.toLocaleString("pt-BR")} bytes).
            </CardContent>
          </Card>
        ) : (
          <CodeViewer
            content={file.content}
            language={extensionToLanguage(uiPath)}
            path={uiPath}
          />
        )}
      </section>
    </PageShell>
  );
}
