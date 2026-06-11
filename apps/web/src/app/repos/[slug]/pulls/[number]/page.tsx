import { AppHeader } from "@/components/app-header";
import { PullRequestDetailPanel } from "@/components/pull-request-detail-panel";
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
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Pull request #{pullRequest.number}</p>
        </div>

        <RepoNav slug={slug} active="pulls" />

        <PullRequestDetailPanel
          slug={slug}
          pullRequest={pullRequest}
          preview={preview}
          commits={commits}
        />
      </section>
    </main>
  );
}
