import { AppHeader } from "@/components/app-header";
import { CheckoutInstructions } from "@/components/checkout-instructions";
import { FileBrowser } from "@/components/file-browser";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import { joinPathSegments } from "@/lib/paths";
import type { RepositoryDetail, RepositoryTreeResponse } from "@svnhub/shared";
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

  const [repo, tree] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryTreeResponse>(
      `/repositories/${slug}/tree?ref=${ref}&path=${encodeURIComponent(uiPath)}${revision ? `&revision=${revision}` : ""}`,
    ),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">{repo.name}</h1>
        <RepoNav slug={slug} active="code" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <FileBrowser
            slug={slug}
            branchRef={ref}
            path={uiPath}
            revision={tree.revision}
            entries={tree.entries}
          />
          <CheckoutInstructions
            slug={slug}
            checkoutUrl={repo.checkoutUrl}
            svnUrl={repo.svnUrl}
            branchRef={ref}
          />
        </div>
      </section>
    </main>
  );
}
