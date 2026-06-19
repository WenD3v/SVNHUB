import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CopyRevisionButton } from "@/components/copy-revision-button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SvnLogEntry } from "@svnhub/shared";

interface CommitDetailHeaderProps {
  slug: string;
  revision: number;
  entry: SvnLogEntry | undefined;
  previousRevision: number | null;
  nextRevision: number | null;
}

export function CommitDetailHeader({
  slug,
  revision,
  entry,
  previousRevision,
  nextRevision,
}: CommitDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-foreground">Revisão</h1>
          <Badge variant="secondary" className="font-mono">
            r{revision}
          </Badge>
          <CopyRevisionButton revision={revision} className="size-8" />
        </div>
        <div className="flex items-center gap-1">
          {previousRevision ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/repos/${slug}/commit/${previousRevision}`}>
                <ChevronLeft className="size-4" />
                r{previousRevision}
              </Link>
            </Button>
          ) : null}
          {nextRevision ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/repos/${slug}/commit/${nextRevision}`}>
                r{nextRevision}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      {entry ? (
        <Card className="overflow-hidden py-0">
          <CardContent className="flex items-start gap-3 p-4 sm:p-5">
            <UserAvatar username={entry.author} className="size-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <pre className="whitespace-pre-wrap font-display text-sm font-semibold leading-relaxed text-foreground">
                {entry.message || "(sem mensagem)"}
              </pre>
              <p className="text-sm text-muted-foreground">
                <Link
                  href={`/users/${entry.author}`}
                  className="font-semibold text-foreground hover:text-brand hover:underline"
                >
                  {entry.author}
                </Link>{" "}
                commitou em{" "}
                {new Date(entry.date).toLocaleString("pt-BR")}
                {entry.paths.length > 0
                  ? ` · ${entry.paths.length} arquivo${entry.paths.length === 1 ? "" : "s"} alterado${entry.paths.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
