import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { BlameViewer } from "@/components/blame-viewer";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import { joinPathSegments } from "@/lib/paths";
import type { RepositoryBlameResponse, RepositoryDetail } from "@svnhub/shared";
import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

interface BlamePageProps {
  params: Promise<{ slug: string; path: string[] }>;
  searchParams: Promise<{ ref?: string; revision?: string }>;
}

export default async function BlamePage({ params, searchParams }: BlamePageProps) {
  const { slug, path } = await params;
  const query = await searchParams;
  const uiPath = joinPathSegments(path);
  const ref = query.ref ?? DEFAULT_BRANCH_UI;
  const revision = query.revision ? Number(query.revision) : undefined;

  const [repo, blame] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryBlameResponse>(
      `/repositories/${slug}/blame?ref=${ref}&path=${encodeURIComponent(uiPath)}${revision ? `&revision=${revision}` : ""}`,
    ),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="font-mono text-sm">Blame · {uiPath}</p>
          <Link href={`/repos/${slug}/blob/${uiPath}?ref=${ref}`} className="text-sm underline">
            Ver arquivo
          </Link>
        </div>
        <RepoNav slug={slug} active="code" />
        <BlameViewer slug={slug} lines={blame.lines} />
      </section>
    </main>
  );
}
