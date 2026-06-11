import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { CreateRefForm, DeleteRefButton } from "@/components/ref-manager";
import { RepoNav } from "@/components/repo-nav";
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
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Releases (tags) · /tags/*</p>
        </div>

        <RepoNav slug={slug} active="tags" />

        <CreateRefForm slug={slug} kind="tag" />

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Tag</th>
                <th className="px-4 py-2">Criada</th>
                <th className="px-4 py-2">Última revisão</th>
                <th className="px-4 py-2">Autor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {tags.refs.map((ref) => (
                <tr key={ref.name} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className="font-medium">{ref.name}</span>
                    <p className="text-xs text-muted-foreground">{ref.svnPath}</p>
                  </td>
                  <td className="px-4 py-3">
                    r{ref.createdRevision}
                    <p className="text-xs text-muted-foreground">{ref.createdAuthor}</p>
                  </td>
                  <td className="px-4 py-3">r{ref.lastChangedRevision}</td>
                  <td className="px-4 py-3">{ref.lastChangedAuthor}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteRefButton slug={slug} name={ref.name} kind="tag" />
                  </td>
                </tr>
              ))}
              {tags.refs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma tag criada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
