import { FileBrowser } from "@/components/file-browser";
import { PageShell } from "@/components/page-shell";
import { RepoAboutCard } from "@/components/repo-about-card";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import { joinPathSegments } from "@/lib/paths";
import type {
  RefListResponse,
  RepositoryDetail,
  RepositoryLogResponse,
  RepositoryTreeResponse,
} from "@svnhub/shared";
import { DEFAULT_BRANCH_UI } from "@svnhub/shared";

interface TreePageProps {
  params: Promise<{ slug: string; path?: string[] }>;
  searchParams: Promise<{ ref?: string; revision?: string }>;
}

export default async function TreePage({ params, searchParams }: TreePageProps) {
  const { slug, path } = await params;
  const query = await searchParams;
  const uiPath = joinPathSegments(path);
  const ref = query.ref ?? DEFAULT_BRANCH_UI;
  const revision = query.revision ? Number(query.revision) : undefined;

  const [repo, tree, branches, tags, log] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryTreeResponse>(
      `/repositories/${slug}/tree?ref=${ref}&path=${encodeURIComponent(uiPath)}${revision ? `&revision=${revision}` : ""}`,
    ),
    apiFetch<RefListResponse>(`/repositories/${slug}/branches`).catch(() => ({ refs: [] })),
    apiFetch<RefListResponse>(`/repositories/${slug}/tags`).catch(() => ({ refs: [] })),
    apiFetch<RepositoryLogResponse>(`/repositories/${slug}/log?limit=1`).catch(() => ({
      entries: [],
      total: 0,
      hasMore: false,
    })),
  ]);

  const latestCommit = log.entries[0] ?? null;

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <RepoBreadcrumbs slug={slug} repoName={repo.name} path={uiPath} />
        <RepoNav slug={slug} active="code" />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <FileBrowser
            slug={slug}
            repoName={repo.name}
            branchRef={ref}
            path={uiPath}
            revision={tree.revision}
            entries={tree.entries}
            branches={branches.refs}
            latestCommit={latestCommit}
          />
          <div className="lg:sticky lg:top-[7.75rem] lg:self-start">
            <RepoAboutCard
              slug={slug}
              description={repo.description}
              checkoutUrl={repo.checkoutUrl}
              svnUrl={repo.svnUrl}
              branchRef={ref}
              healthStatus={repo.health.status}
              branchCount={branches.refs.length}
              tagCount={tags.refs.length}
              revisionCount={log.total}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
