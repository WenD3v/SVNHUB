import Link from "next/link";
import { GitCompare, Tag } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ChangelogSection } from "@svnhub/shared";

interface ChangelogTimelineProps {
  slug: string;
  sections: ChangelogSection[];
}

export function ChangelogTimeline({ slug, sections }: ChangelogTimelineProps) {
  if (sections.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="Nenhuma release encontrada"
        description="Crie tags no repositório para gerar um changelog orientado a releases."
      />
    );
  }

  return (
    <div className="relative space-y-8 before:absolute before:bottom-0 before:left-[15px] before:top-2 before:w-px before:bg-border">
      {sections.map((section) => (
        <section key={`${section.kind}-${section.name}`} className="relative pl-10">
          <div className="absolute left-2.5 top-1.5 size-3 rounded-full border-2 border-brand bg-brand shadow-[0_0_0_3px_var(--card)]" />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground">{section.name}</h2>
              {section.kind === "unreleased" ? (
                <Badge variant="warning">Unreleased</Badge>
              ) : (
                <Badge variant="secondary" className="font-mono">
                  r{section.createdRevision}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {section.createdAuthor} · {new Date(section.createdDate).toLocaleString("pt-BR")}
              {section.entries.length > 0
                ? ` · ${section.entries.length} revisão(ões) entre r${section.revisionFrom} e r${section.revisionTo}`
                : ""}
            </p>
            {section.kind === "tag" && section.previousTagName ? (
              <Link
                href={`/repos/${slug}/compare?source=${encodeURIComponent(section.previousTagName)}&target=${encodeURIComponent(section.name)}`}
                className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                <GitCompare className="size-3.5" aria-hidden />
                Comparar {section.previousTagName} ↔ {section.name}
              </Link>
            ) : null}
            {section.entries.length > 0 ? (
              <Card className="overflow-hidden py-0">
                <CardContent className="divide-y divide-border p-0">
                  {section.entries.map((entry) => (
                    <div
                      key={entry.revision}
                      className="flex items-start gap-3 px-4 py-3 sm:px-5"
                    >
                      <UserAvatar username={entry.author} className="mt-0.5 size-7 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/repos/${slug}/commit/${entry.revision}`}
                            className="font-mono text-sm font-medium text-brand hover:underline"
                          >
                            r{entry.revision}
                          </Link>
                          <span className="text-sm text-muted-foreground">{entry.author}</span>
                          <span className="text-xs text-foreground-subtle">
                            {new Date(entry.date).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">
                          {entry.message.split("\n")[0] || "(sem mensagem)"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma revisão neste intervalo.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
