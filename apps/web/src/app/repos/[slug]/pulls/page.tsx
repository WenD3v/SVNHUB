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
import type { PullRequestListResponse, RepositoryDetail } from "@svnhub/shared";

interface PullRequestsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
}

const STATUS_VARIANTS: Record<string, "default" | "success" | "destructive" | "muted"> = {
  OPEN: "default",
  MERGED: "success",
  CLOSED: "destructive",
};

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
    { label: "Todos", href: `/repos/${slug}/pulls`, active: !query.status },
    { label: "Open", href: `/repos/${slug}/pulls?status=OPEN`, active: query.status === "OPEN" },
    {
      label: "Merged",
      href: `/repos/${slug}/pulls?status=MERGED`,
      active: query.status === "MERGED",
    },
    {
      label: "Closed",
      href: `/repos/${slug}/pulls?status=CLOSED`,
      active: query.status === "CLOSED",
    },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Pull requests</h1>
        </div>

        <RepoNav slug={slug} active="pulls" />

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.label}
              variant={filter.active ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={filter.href} className={cn(!filter.active && "text-muted-foreground")}>
                {filter.label}
              </Link>
            </Button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pullRequests.pullRequests.map((pr) => (
                  <TableRow key={pr.id}>
                    <TableCell className="text-muted-foreground">{pr.number}</TableCell>
                    <TableCell>
                      <Link
                        href={`/repos/${slug}/pulls/${pr.number}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {pr.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1 font-mono text-xs">{pr.sourceRef}</code>
                      {" → "}
                      <code className="rounded bg-muted px-1 font-mono text-xs">{pr.targetRef}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          username={pr.author.username}
                          avatarUrl={pr.author.avatarUrl}
                          className="size-7"
                        />
                        <Link
                          href={`/users/${pr.author.username}`}
                          className="hover:underline"
                        >
                          {pr.author.username}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[pr.status] ?? "muted"}>{pr.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {pullRequests.pullRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhum pull request encontrado.
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
