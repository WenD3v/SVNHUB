"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, GitCommitHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

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
    return <p className="font-semibold leading-snug text-foreground">{firstLine}</p>;
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
        <span className="font-semibold leading-snug text-foreground">{firstLine}</span>
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
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.day}>
          <div className="mb-3 flex items-center gap-2 px-0.5">
            <GitCommitHorizontal className="size-3.5 text-foreground-subtle" aria-hidden />
            <h2 className="font-display text-[13.5px] font-semibold capitalize text-foreground">
              {formatDayHeader(group.entries[0]!.date)}
            </h2>
          </div>
          <Card className="divide-y divide-border overflow-hidden py-0">
            {group.entries.map((entry) => (
              <Link
                key={entry.revision}
                href={`/repos/${slug}/commit/${entry.revision}`}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50 sm:px-5"
              >
                <UserAvatar username={entry.author} className="size-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="transition-colors group-hover:[&_p]:text-brand group-hover:[&_span]:text-brand">
                    <CommitMessage message={entry.message} />
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    <span className="font-semibold text-muted-foreground">{entry.author}</span> commitou às{" "}
                    {new Date(entry.date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {entry.paths.length > 0
                      ? ` · ${entry.paths.length} arquivo${entry.paths.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 font-mono text-[11.5px] font-medium">
                  r{entry.revision}
                </Badge>
              </Link>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
