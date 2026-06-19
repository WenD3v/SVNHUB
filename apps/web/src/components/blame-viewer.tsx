import Link from "next/link";

import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { SvnBlameLine } from "@svnhub/shared";
import { cn } from "@/lib/utils";

interface BlameViewerProps {
  slug: string;
  lines: SvnBlameLine[];
  path?: string;
  className?: string;
}

export function BlameViewer({ slug, lines, path, className }: BlameViewerProps) {
  return (
    <Card className={cn("overflow-hidden py-0", className)}>
      {path ? (
        <div className="border-b border-border bg-secondary px-4 py-2.5 font-mono text-xs text-muted-foreground sm:px-5">
          {path}
        </div>
      ) : null}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/80 text-left text-muted-foreground">
                <th className="w-14 px-3 py-2 text-right font-medium">Linha</th>
                <th className="w-16 px-3 py-2 text-right font-medium">Rev</th>
                <th className="w-36 px-3 py-2 font-medium">Autor</th>
                <th className="px-3 py-2 font-medium">Conteúdo</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.lineNumber}
                  className="border-b border-border/60 transition-colors hover:bg-accent/40"
                >
                  <td className="px-3 py-0.5 text-right text-foreground-subtle select-none">
                    {line.lineNumber}
                  </td>
                  <td className="px-3 py-0.5 text-right">
                    <Link
                      href={`/repos/${slug}/commit/${line.revision}`}
                      className="text-brand hover:underline"
                    >
                      r{line.revision}
                    </Link>
                  </td>
                  <td className="px-3 py-0.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserAvatar username={line.author} className="size-6" />
                      <Link
                        href={`/users/${line.author}`}
                        className="truncate hover:text-brand hover:underline"
                      >
                        {line.author}
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-pre px-3 py-0.5 text-foreground">{line.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
