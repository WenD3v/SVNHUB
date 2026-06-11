import { PageShell } from "@/components/page-shell";
import { PullRequestDetailPanel } from "@/components/pull-request-detail-panel";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type {
  MergePreviewResponse,
  PullRequestCommitsResponse,
  PullRequestDetail,
  RepositoryDetail,
} from "@svnhub/shared";

interface PullRequestPageProps {
  params: Promise<{ slug: string; number: string }>;
}

export default async function PullRequestPage({ params }: PullRequestPageProps) {
  const { slug, number } = await params;
  const prNumber = Number.parseInt(number, 10);

  const [repo, pullRequest, preview, commits] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<PullRequestDetail>(`/repositories/${slug}/pull-requests/${prNumber}`),
    apiFetch<MergePreviewResponse>(
      `/repositories/${slug}/pull-requests/${prNumber}/preview`,
    ).catch(() => null),
    apiFetch<PullRequestCommitsResponse>(
      `/repositories/${slug}/pull-requests/${prNumber}/commits`,
    ),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">
            {pullRequest.title}{" "}
            <span className="text-muted-foreground">#{pullRequest.number}</span>
          </h1>
        </div>

        <RepoNav slug={slug} active="pulls" />

        <PullRequestDetailPanel
          slug={slug}
          pullRequest={pullRequest}
          preview={preview}
          commits={commits}
        />
      </section>
    </PageShell>
  );
}
