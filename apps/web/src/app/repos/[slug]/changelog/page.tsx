import { ChangelogTimeline } from "@/components/changelog-timeline";
import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { RepositoryChangelogResponse, RepositoryDetail } from "@svnhub/shared";

interface ChangelogPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChangelogPage({ params }: ChangelogPageProps) {
  const { slug } = await params;

  const [repo, changelog] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepositoryChangelogResponse>(`/repositories/${slug}/changelog?limit=100`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Changelog</h1>
          <p className="text-sm text-muted-foreground">
            Histórico orientado a releases com base nas tags do repositório.
          </p>
        </div>

        <RepoNav slug={slug} active="changelog" />
        <ChangelogTimeline slug={slug} sections={changelog.sections} />
      </section>
    </PageShell>
  );
}
