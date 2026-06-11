import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { RepoNav } from "@/components/repo-nav";
import { apiFetch } from "@/lib/api";
import type { PullRequestListResponse, RepositoryDetail } from "@svnhub/shared";

interface PullRequestsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function PullRequestsPage({
  params,
  searchParams,
}: PullRequestsPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const statusQuery = query.status ? `?status=${encodeURIComponent(query.status)}` : "";

  const [repo, pullRequests] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<PullRequestListResponse>(`/repositories/${slug}/pull-requests${statusQuery}`),
  ]);

  const filters = [
    { label: "Open", value: "OPEN" },
    { label: "Merged", value: "MERGED" },
    { label: "Closed", value: "CLOSED" },
  ];

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Pull requests</p>
        </div>

        <RepoNav slug={slug} active="pulls" />

        <div className="flex gap-2">
          <Link
            href={`/repos/${slug}/pulls`}
            className={
              !query.status
                ? "rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                : "rounded-md border border-border px-3 py-1 text-sm"
            }
          >
            Todos
          </Link>
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={`/repos/${slug}/pulls?status=${filter.value}`}
              className={
                query.status === filter.value
                  ? "rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                  : "rounded-md border border-border px-3 py-1 text-sm"
              }
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2">Branch</th>
                <th className="px-4 py-2">Autor</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pullRequests.pullRequests.map((pr) => (
                <tr key={pr.id} className="border-t border-border">
                  <td className="px-4 py-3">{pr.number}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/repos/${slug}/pulls/${pr.number}`}
                      className="font-medium hover:underline"
                    >
                      {pr.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1">{pr.sourceRef}</code>
                    {" → "}
                    <code className="rounded bg-muted px-1">{pr.targetRef}</code>
                  </td>
                  <td className="px-4 py-3">{pr.author.username}</td>
                  <td className="px-4 py-3">{pr.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pullRequests.pullRequests.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum pull request encontrado.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
