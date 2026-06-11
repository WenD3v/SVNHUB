import { PageShell } from "@/components/page-shell";
import { CreateRefForm, DeleteRefButton } from "@/components/ref-manager";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
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

interface TagsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TagsPage({ params }: TagsPageProps) {
  const { slug } = await params;

  const [repo, tags] = await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RefListResponse>(`/repositories/${slug}/tags`),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Releases</h1>
          <p className="text-sm text-muted-foreground">Tags · /tags/*</p>
        </div>

        <RepoNav slug={slug} active="tags" />

        <CreateRefForm slug={slug} kind="tag" />

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Tag</TableHead>
                  <TableHead>Criada</TableHead>
                  <TableHead>Última revisão</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.refs.map((ref) => (
                  <TableRow key={ref.name}>
                    <TableCell>
                      <span className="font-medium">{ref.name}</span>
                      <p className="font-mono text-xs text-muted-foreground">{ref.svnPath}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">r{ref.createdRevision}</span>
                      <p className="text-xs text-muted-foreground">{ref.createdAuthor}</p>
                    </TableCell>
                    <TableCell className="font-mono">r{ref.lastChangedRevision}</TableCell>
                    <TableCell>{ref.lastChangedAuthor}</TableCell>
                    <TableCell className="text-right">
                      <DeleteRefButton slug={slug} name={ref.name} kind="tag" />
                    </TableCell>
                  </TableRow>
                ))}
                {tags.refs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhuma tag criada.
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
