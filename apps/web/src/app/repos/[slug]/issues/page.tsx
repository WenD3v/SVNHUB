import Link from "next/link";
import { CircleDot, Plus, Search } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { IssueListResponse, LabelListResponse, RepositoryDetail } from "@svnhub/shared";

interface IssuesPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    status?: string;
    label?: string;
    assignee?: string;
    author?: string;
    search?: string;
  }>;
}

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function issueStatusLabel(status: "OPEN" | "CLOSED") {
  return status === "OPEN" ? "aberta" : "fechada";
}

export default async function IssuesPage({ params, searchParams }: IssuesPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const status = query.status === "CLOSED" ? "CLOSED" : "OPEN";
  const listQuery = buildQuery({ ...query, status });

  const [repo, issues, labels] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<IssueListResponse>(`/repositories/${slug}/issues${listQuery}`),
    apiFetch<LabelListResponse>(`/repositories/${slug}/labels`),
  ]);

  const tabs = [
    {
      label: "Abertas",
      href: `/repos/${slug}/issues?status=OPEN`,
      active: status === "OPEN",
      count: issues.openCount,
    },
    {
      label: "Fechadas",
      href: `/repos/${slug}/issues?status=CLOSED`,
      active: status === "CLOSED",
      count: status === "CLOSED" ? issues.total : undefined,
    },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <RepoBreadcrumbs slug={slug} repoName={repo.name} />
            <h1 className="font-display text-xl font-semibold text-foreground">Issues</h1>
          </div>
          <Button asChild>
            <Link href={`/repos/${slug}/issues/new`}>
              <Plus className="size-4" aria-hidden />
              Nova issue
            </Link>
          </Button>
        </div>

        <RepoNav slug={slug} active="issues" openIssueCount={issues.openCount} />

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex gap-0.5 rounded-lg bg-secondary p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  tab.active
                    ? "bg-card text-foreground shadow-[var(--card-shadow)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span className="ml-1 text-foreground-subtle">{tab.count}</span>
                ) : null}
              </Link>
            ))}
          </div>

          <form
            className="flex min-w-[200px] flex-1 flex-wrap items-center gap-2"
            action={`/repos/${slug}/issues`}
            method="get"
          >
            <input type="hidden" name="status" value={status} />
            <div className="relative min-w-[180px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-foreground-subtle"
                aria-hidden
              />
              <Input
                name="search"
                defaultValue={query.search ?? ""}
                placeholder="Buscar por título"
                className="h-9 pl-9"
              />
            </div>
            <select
              name="label"
              defaultValue={query.label ?? ""}
              className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">Todas as labels</option>
              {labels.labels.map((label) => (
                <option key={label.id} value={label.name}>
                  {label.name}
                </option>
              ))}
            </select>
            <Input
              name="assignee"
              defaultValue={query.assignee ?? ""}
              placeholder="Assignee"
              className="h-9 w-32"
            />
            <Input
              name="author"
              defaultValue={query.author ?? ""}
              placeholder="Autor"
              className="h-9 w-32"
            />
            <Button type="submit" size="sm" variant="outline" className="h-9">
              Filtrar
            </Button>
          </form>
        </div>

        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            {issues.issues.length === 0 ? (
              <div className="px-5 py-8">
                <EmptyState
                  icon={CircleDot}
                  title="Nenhuma issue"
                  description="Nenhuma issue encontrada."
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {issues.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-accent/30"
                  >
                    <CircleDot
                      className={cn(
                        "size-[17px] shrink-0",
                        issue.status === "OPEN" ? "text-success" : "text-foreground-subtle",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/repos/${slug}/issues/${issue.number}`}
                          className="text-sm font-semibold text-foreground hover:text-brand"
                        >
                          {issue.title}
                        </Link>
                        {issue.labels.map((label) => (
                          <span
                            key={label.id}
                            className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{
                              backgroundColor: `${label.color}22`,
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">
                        <span className="font-mono">#{issue.number}</span>
                        {" · "}
                        {issueStatusLabel(issue.status)} por {issue.author.username}
                      </p>
                    </div>
                    {issue.assignee ? (
                      <UserAvatar
                        username={issue.assignee.username}
                        avatarUrl={issue.assignee.avatarUrl}
                        className="size-7 shrink-0"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
