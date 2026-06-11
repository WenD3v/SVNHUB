import Link from "next/link";

import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SvnBlameLine } from "@svnhub/shared";

interface BlameViewerProps {
  slug: string;
  lines: SvnBlameLine[];
}

export function BlameViewer({ slug, lines }: BlameViewerProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Table className="font-mono text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-right">Linha</TableHead>
              <TableHead className="w-16 text-right">Rev</TableHead>
              <TableHead className="w-32">Autor</TableHead>
              <TableHead>Conteúdo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.lineNumber}>
                <TableCell className="text-right text-muted-foreground">{line.lineNumber}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/repos/${slug}/commit/${line.revision}`}
                    className="text-primary hover:underline"
                  >
                    r{line.revision}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserAvatar username={line.author} className="size-6" />
                    <Link href={`/users/${line.author}`} className="truncate hover:underline">
                      {line.author}
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="whitespace-pre">{line.text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
