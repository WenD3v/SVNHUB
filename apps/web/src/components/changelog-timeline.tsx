import Link from "next/link";
import { GitCompare, Tag } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    <div className="relative space-y-8 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border">
      {sections.map((section) => (
        <section key={`${section.kind}-${section.name}`} className="relative pl-10">
          <div className="absolute left-2.5 top-1 size-3 rounded-full border-2 border-primary bg-background" />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{section.name}</h2>
              {section.kind === "unreleased" ? (
                <Badge variant="warning">Unreleased</Badge>
              ) : (
                <Badge variant="outline" className="font-mono">
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
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <GitCompare className="size-3.5" />
                Comparar {section.previousTagName} ↔ {section.name}
              </Link>
            ) : null}
            {section.entries.length > 0 ? (
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {section.entries.map((entry) => (
                    <div key={entry.revision} className="flex items-start gap-3 px-4 py-3">
                      <Avatar className="mt-0.5 size-7">
                        <AvatarFallback username={entry.author} />
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/repos/${slug}/commit/${entry.revision}`}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            r{entry.revision}
                          </Link>
                          <span className="text-sm text-muted-foreground">{entry.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">
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
