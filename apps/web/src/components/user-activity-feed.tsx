import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { UserActivityResponse } from "@svnhub/shared";
import { Activity } from "lucide-react";

interface UserActivityFeedProps {
  data: UserActivityResponse;
}

function formatActivityLabel(item: UserActivityResponse["items"][number]): string {
  switch (item.kind) {
    case "revision":
      return `Commit r${item.revision} em ${item.repositoryName}`;
    case "pull_request_opened":
      return `Abriu PR #${item.number} em ${item.repositoryName}`;
    case "pull_request_merged":
      return `Mergeou PR #${item.number} em ${item.repositoryName}`;
  }
}

export function UserActivityFeed({ data }: UserActivityFeedProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          {data.items.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Sem atividade"
              description="Nenhuma revisão ou pull request visível."
              className="py-6"
            />
          ) : (
            <div className="divide-y divide-border">
              {data.items.map((item) => (
                <div key={`${item.kind}-${item.repositorySlug}-${item.date}`} className="py-3">
                  <p className="text-sm font-medium">{formatActivityLabel(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.kind === "revision" ? item.message || "Sem mensagem" : item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Repositórios mais ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.activeRepositories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum repositório ativo recentemente.</p>
          ) : (
            <div className="space-y-3">
              {data.activeRepositories.map((repo) => (
                <div key={repo.slug} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/repos/${repo.slug}`} className="font-medium text-primary hover:underline">
                    {repo.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {repo.commitCount} commit{repo.commitCount === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
