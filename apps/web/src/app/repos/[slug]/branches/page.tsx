import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { CreateRefForm, DeleteRefButton } from "@/components/ref-manager";
import { RepoNav } from "@/components/repo-nav";
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
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Branches · main = /trunk</p>
        </div>

        <RepoNav slug={slug} active="branches" />

        <CreateRefForm slug={slug} kind="branch" />

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Branch</th>
                <th className="px-4 py-2">Criada</th>
                <th className="px-4 py-2">Último commit</th>
                <th className="px-4 py-2">Autor</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {branches.refs.map((ref) => (
                <tr key={ref.name} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/repos/${slug}?ref=${ref.name}`} className="font-medium hover:underline">
                      {ref.name}
                      {ref.isDefault ? (
                        <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 text-xs">default</span>
                      ) : null}
                    </Link>
                    <p className="text-xs text-muted-foreground">{ref.svnPath}</p>
                  </td>
                  <td className="px-4 py-3">
                    r{ref.createdRevision}
                    <p className="text-xs text-muted-foreground">{ref.createdAuthor}</p>
                  </td>
                  <td className="px-4 py-3">r{ref.lastChangedRevision}</td>
                  <td className="px-4 py-3">{ref.lastChangedAuthor}</td>
                  <td className="px-4 py-3 text-right">
                    {!ref.isDefault ? (
                      <DeleteRefButton slug={slug} name={ref.name} kind="branch" />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
