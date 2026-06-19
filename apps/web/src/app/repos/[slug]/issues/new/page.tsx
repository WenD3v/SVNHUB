import { PageShell } from "@/components/page-shell";
import { IssueNewForm } from "@/components/issue-new-form";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { IssueListResponse, RepositoryDetail } from "@svnhub/shared";

interface IssueNewPageProps {
  params: Promise<{ slug: string }>;
}

export default async function IssueNewPage({ params }: IssueNewPageProps) {
  const { slug } = await params;

  const [repo, issues] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<IssueListResponse>(`/repositories/${slug}/issues?status=OPEN&limit=1`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="font-display text-xl font-semibold text-foreground">Nova issue</h1>
        </div>

        <RepoNav slug={slug} active="issues" openIssueCount={issues.openCount} />

        <IssueNewForm slug={slug} />
      </section>
    </PageShell>
  );
}
