import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { CreateRefForm, DeleteRefButton } from "@/components/ref-manager";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import type { RefListResponse, RepositoryDetail } from "@svnhub/shared";

interface BranchesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BranchesPage({ params }: BranchesPageProps) {
  const { slug } = await params;

  const [repo, branches] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RefListResponse>(`/repositories/${slug}/branches`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Branches</h1>
          <p className="text-sm text-muted-foreground">main = /trunk</p>
        </div>

        <RepoNav slug={slug} active="branches" />

        <CreateRefForm slug={slug} kind="branch" />

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Branch</TableHead>
                  <TableHead>Criada</TableHead>
                  <TableHead>Último commit</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.refs.map((ref) => (
                  <TableRow key={ref.name}>
                    <TableCell>
                      <Link
                        href={`/repos/${slug}?ref=${ref.name}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {ref.name}
                      </Link>
                      {ref.isDefault ? (
                        <Badge variant="secondary" className="ml-2">
                          default
                        </Badge>
                      ) : null}
                      <p className="font-mono text-xs text-muted-foreground">{ref.svnPath}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">r{ref.createdRevision}</span>
                      <p className="text-xs text-muted-foreground">{ref.createdAuthor}</p>
                    </TableCell>
                    <TableCell className="font-mono">r{ref.lastChangedRevision}</TableCell>
                    <TableCell>{ref.lastChangedAuthor}</TableCell>
                    <TableCell className="text-right">
                      {!ref.isDefault ? (
                        <DeleteRefButton slug={slug} name={ref.name} kind="branch" />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
