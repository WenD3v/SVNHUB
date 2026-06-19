import Link from "next/link";

import { BlameViewer } from "@/components/blame-viewer";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Button } from "@/components/ui/button";
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
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <RepoBreadcrumbs slug={slug} repoName={repo.name} path={uiPath} />
        <Button variant="outline" size="sm" asChild>
          <Link href={`/repos/${slug}/blob/${uiPath}?ref=${ref}`}>Ver arquivo</Link>
        </Button>
        <RepoNav slug={slug} active="code" />
        <BlameViewer slug={slug} lines={blame.lines} path={uiPath} />
      </section>
    </PageShell>
  );
}
