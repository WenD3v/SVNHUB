import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      label: "Open",
      href: `/repos/${slug}/issues?status=OPEN`,
      active: status === "OPEN",
      count: issues.openCount,
    },
    {
      label: "Closed",
      href: `/repos/${slug}/issues?status=CLOSED`,
      active: status === "CLOSED",
    },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <RepoBreadcrumbs slug={slug} repoName={repo.name} />
            <h1 className="text-xl font-semibold">Issues</h1>
          </div>
          <Button asChild>
            <Link href={`/repos/${slug}/issues/new`}>Nova issue</Link>
          </Button>
        </div>

        <RepoNav slug={slug} active="issues" openIssueCount={issues.openCount} />

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.label}
              variant={tab.active ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={tab.href} className={cn(!tab.active && "text-muted-foreground")}>
                {tab.label}
                {tab.count !== undefined ? ` (${tab.count})` : ""}
              </Link>
            </Button>
          ))}
        </div>

        <form className="grid gap-3 md:grid-cols-4" action={`/repos/${slug}/issues`} method="get">
          <input type="hidden" name="status" value={status} />
          <input
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Buscar por título"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <select
            name="label"
            defaultValue={query.label ?? ""}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas as labels</option>
            {labels.labels.map((label) => (
              <option key={label.id} value={label.name}>
                {label.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              name="assignee"
              defaultValue={query.assignee ?? ""}
              placeholder="Assignee"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              name="author"
              defaultValue={query.author ?? ""}
              placeholder="Autor"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" size="sm" className="md:col-span-4 md:w-fit">
            Filtrar
          </Button>
        </form>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-muted-foreground">{issue.number}</TableCell>
                    <TableCell>
                      <Link
                        href={`/repos/${slug}/issues/${issue.number}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {issue.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <span
                            key={label.id}
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${label.color}22`,
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {issue.assignee ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            username={issue.assignee.username}
                            avatarUrl={issue.assignee.avatarUrl}
                            className="size-7"
                          />
                          <span>{issue.assignee.username}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          username={issue.author.username}
                          avatarUrl={issue.author.avatarUrl}
                          className="size-7"
                        />
                        <Link href={`/users/${issue.author.username}`} className="hover:underline">
                          {issue.author.username}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={issue.status === "OPEN" ? "default" : "muted"}>
                        {issue.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {issues.issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhuma issue encontrada.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
