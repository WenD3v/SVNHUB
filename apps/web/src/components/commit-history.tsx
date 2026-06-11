"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, GitCommitHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { CopyRevisionButton } from "@/components/copy-revision-button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { SvnLogEntry } from "@svnhub/shared";

interface CommitHistoryProps {
  slug: string;
  entries: SvnLogEntry[];
}

function formatDayHeader(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDay(entries: SvnLogEntry[]): Array<{ day: string; entries: SvnLogEntry[] }> {
  const groups = new Map<string, SvnLogEntry[]>();

  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
    const bucket = groups.get(day) ?? [];
    bucket.push(entry);
    groups.set(day, bucket);
  }

  return [...groups.entries()].map(([day, dayEntries]) => ({
    day,
    entries: dayEntries,
  }));
}

function CommitMessage({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = message.split("\n");
  const firstLine = lines[0] || "(sem mensagem)";
  const rest = lines.slice(1).join("\n").trim();

  if (!rest) {
    return <p className="font-medium leading-snug">{firstLine}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-start gap-1 text-left"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium leading-snug">{firstLine}</span>
      </button>
      {expanded ? (
        <pre className="mt-2 whitespace-pre-wrap pl-5 text-sm text-muted-foreground">{rest}</pre>
      ) : null}
    </div>
  );
}

export function CommitHistory({ slug, entries }: CommitHistoryProps) {
  const groups = useMemo(() => groupByDay(entries), [entries]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={GitCommitHorizontal}
        title="Nenhuma revisão encontrada"
        description="Tente ajustar os filtros ou aguarde novos commits no repositório."
      />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.day}>
          <div className="sticky top-14 z-10 border-b border-border bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <h2 className="text-sm font-semibold capitalize text-foreground">
              {formatDayHeader(group.entries[0]!.date)}
            </h2>
          </div>
          <Card className="divide-y divide-border overflow-hidden">
            {group.entries.map((entry) => (
              <Link
                key={entry.revision}
                href={`/repos/${slug}/commit/${entry.revision}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <UserAvatar username={entry.author} className="mt-0.5 size-8" />
                <div className="min-w-0 flex-1">
                  <CommitMessage message={entry.message} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.author} commitou às{" "}
                    {new Date(entry.date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {entry.paths.length > 0 ? ` · ${entry.paths.length} arquivo(s)` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <CopyRevisionButton revision={entry.revision} className="size-7" />
                  <Badge
                    variant="outline"
                    className="font-mono hover:bg-muted"
                    onClick={(event) => event.stopPropagation()}
                  >
                    r{entry.revision}
                  </Badge>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
