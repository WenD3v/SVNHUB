import { PageShell } from "@/components/page-shell";
import { IssueDetailPanel } from "@/components/issue-detail-panel";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import type {
  IssueDetail,
  IssueListResponse,
  LabelListResponse,
  RepositoryDetail,
} from "@svnhub/shared";

interface IssueDetailPageProps {
  params: Promise<{ slug: string; number: string }>;
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const { slug, number } = await params;
  const issueNumber = Number.parseInt(number, 10);

  const [repo, issue, labels, openIssues] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<IssueDetail>(`/repositories/${slug}/issues/${issueNumber}`),
    apiFetch<LabelListResponse>(`/repositories/${slug}/labels`),
    apiFetch<IssueListResponse>(`/repositories/${slug}/issues?status=OPEN&limit=1`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">
              {issue.title}{" "}
              <span className="text-muted-foreground">#{issue.number}</span>
            </h1>
            <Badge variant={issue.status === "OPEN" ? "default" : "muted"}>{issue.status}</Badge>
          </div>
        </div>

        <RepoNav slug={slug} active="issues" openIssueCount={openIssues.openCount} />

        <IssueDetailPanel slug={slug} issue={issue} labels={labels.labels} />
      </section>
    </PageShell>
  );
}
