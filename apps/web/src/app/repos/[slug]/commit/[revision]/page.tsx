import { AppHeader } from "@/components/app-header";
import { DiffViewer } from "@/components/diff-viewer";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { RepositoryDetail, RepositoryDiffResponse, RepositoryLogResponse } from "@svnhub/shared";

interface CommitPageProps {
  params: Promise<{ slug: string; revision: string }>;
}

export default async function CommitPage({ params }: CommitPageProps) {
  const { slug, revision } = await params;
  const rev = Number(revision);

  const [repo, diff, log] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryDiffResponse>(`/repositories/${slug}/revisions/${rev}`),
    apiFetch<RepositoryLogResponse>(`/repositories/${slug}/log?revision=${rev}&limit=1`),
  ]);

  const entry = log.entries[0];

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm">
            Revisão <strong>r{rev}</strong>
          </p>
          {entry ? (
            <p className="text-sm text-muted-foreground">
              {entry.author} · {new Date(entry.date).toLocaleString("pt-BR")} ·{" "}
              {entry.message || "(sem mensagem)"}
            </p>
          ) : null}
        </div>
        <RepoNav slug={slug} active="commits" />
        <DiffViewer files={diff.files} />
      </section>
    </main>
  );
}
