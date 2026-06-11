import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { CodeViewer } from "@/components/code-viewer";
import { RepoNav } from "@/components/repo-nav";
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

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="font-mono text-sm">{uiPath}</p>
          <div className="flex gap-3 text-sm">
            <Link href={`/repos/${slug}/blame/${uiPath}?ref=${ref}`} className="underline">
              Blame
            </Link>
            <Link href={`/repos/${slug}/tree/${uiPath.split("/").slice(0, -1).join("/")}?ref=${ref}`} className="underline">
              Voltar
            </Link>
          </div>
        </div>
        <RepoNav slug={slug} active="code" />
        {file.isBinary ? (
          <p className="text-sm text-muted-foreground">Arquivo binário ({file.size} bytes).</p>
        ) : (
          <CodeViewer content={file.content} language={extensionToLanguage(uiPath)} />
        )}
      </section>
    </main>
  );
}
