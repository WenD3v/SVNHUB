import Link from "next/link";
import { File, Folder } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SvnTreeEntry } from "@svnhub/shared";

interface FileBrowserProps {
  slug: string;
  branchRef: string;
  path: string;
  revision: number;
  entries: SvnTreeEntry[];
}

export function FileBrowser({ slug, branchRef, path, revision, entries }: FileBrowserProps) {
  const sorted = [...entries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30 py-2">
        <p className="font-mono text-xs text-muted-foreground">
          {branchRef}
          {path ? ` / ${path}` : ""} @ r{revision}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead className="hidden w-28 text-right sm:table-cell">Tamanho</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((entry) => {
              const nextPath = path ? `${path}/${entry.name}` : entry.name;
              const href =
                entry.kind === "dir"
                  ? `/repos/${slug}/tree/${nextPath}?ref=${branchRef}&revision=${revision}`
                  : `/repos/${slug}/blob/${nextPath}?ref=${branchRef}&revision=${revision}`;

              return (
                <TableRow key={entry.path}>
                  <TableCell>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      {entry.kind === "dir" ? (
                        <Folder className="size-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <File className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="font-mono text-sm">{entry.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-right font-mono text-xs text-muted-foreground sm:table-cell">
                    {entry.kind === "file" && entry.size != null
                      ? `${entry.size.toLocaleString("pt-BR")} B`
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                  Diretório vazio.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
