import Link from "next/link";
import { Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardActivityFeed, DashboardActivityItem } from "@svnhub/shared";

interface DashboardActivityFeedProps {
  feed: DashboardActivityFeed;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function formatActivityLabel(item: DashboardActivityItem): string {
  switch (item.kind) {
    case "revision":
      return `${item.author} commitou r${item.revision} em ${item.repositoryName}`;
    case "pull_request_opened":
      return `${item.authorUsername} abriu PR #${item.number} em ${item.repositoryName}`;
    case "pull_request_merged":
      return `${item.authorUsername} mergeou PR #${item.number} em ${item.repositoryName}`;
    case "pull_request_closed":
      return `${item.authorUsername} fechou PR #${item.number} em ${item.repositoryName}`;
    case "pipeline":
      return `Pipeline ${item.status.toLowerCase()} em ${item.repositoryName} (r${item.revision})`;
  }
}

function activityHref(item: DashboardActivityItem): string | null {
  switch (item.kind) {
    case "revision":
      return `/repos/${item.repositorySlug}/commits?revision=${item.revision}`;
    case "pull_request_opened":
    case "pull_request_merged":
    case "pull_request_closed":
      return `/repos/${item.repositorySlug}/pulls/${item.number}`;
    case "pipeline":
      return `/repos/${item.repositorySlug}/pipelines/${item.pipelineId}`;
  }
}

export function DashboardActivityFeed({
  feed,
  loadingMore,
  onLoadMore,
}: DashboardActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Feed de atividade</CardTitle>
      </CardHeader>
      <CardContent>
        {feed.items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sem atividade"
            description="Nenhuma atividade recente nos repositórios acessíveis."
            className="py-6"
          />
        ) : (
          <div className="divide-y divide-border">
            {feed.items.map((item) => {
              const href = activityHref(item);
              const label = formatActivityLabel(item);

              return (
                <div
                  key={`${item.kind}-${item.repositorySlug}-${item.date}-${item.kind === "pipeline" ? item.pipelineId : item.kind === "revision" ? item.revision : item.number}`}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  {href ? (
                    <Link href={href} className="text-sm font-medium text-primary hover:underline">
                      {label}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{label}</p>
                  )}
                  {"message" in item && item.message ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                  ) : "title" in item ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.title}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleString("pt-BR")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {feed.hasMore && onLoadMore ? (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
