import Link from "next/link";
import {
  Activity,
  GitCommitHorizontal,
  GitMerge,
  GitPullRequest,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { DashboardActivityFeed, DashboardActivityItem } from "@svnhub/shared";

interface DashboardActivityFeedProps {
  feed: DashboardActivityFeed;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

function formatRelativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "agora";
  }
  if (minutes < 60) {
    return `há ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `há ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `há ${days} d`;
  }

  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

function getActivityPresentation(item: DashboardActivityItem): {
  who: string;
  text: string;
  sub: string | null;
  icon: React.ReactNode;
  iconClassName: string;
} {
  switch (item.kind) {
    case "revision":
      return {
        who: item.author,
        text: `commitou r${item.revision} em ${item.repositoryName}`,
        sub: item.message,
        icon: <GitCommitHorizontal className="size-3.5" aria-hidden />,
        iconClassName: "bg-brand-soft text-brand",
      };
    case "pull_request_opened":
      return {
        who: item.authorUsername,
        text: `abriu PR #${item.number} em ${item.repositoryName}`,
        sub: item.title,
        icon: <GitPullRequest className="size-3.5" aria-hidden />,
        iconClassName: "bg-brand-soft text-brand",
      };
    case "pull_request_merged":
      return {
        who: item.authorUsername,
        text: `mergeou PR #${item.number} em ${item.repositoryName}`,
        sub: item.title,
        icon: <GitMerge className="size-3.5" aria-hidden />,
        iconClassName: "bg-success-soft text-success",
      };
    case "pull_request_closed":
      return {
        who: item.authorUsername,
        text: `fechou PR #${item.number} em ${item.repositoryName}`,
        sub: item.title,
        icon: <X className="size-3.5" aria-hidden />,
        iconClassName: "bg-destructive-soft text-destructive",
      };
    case "pipeline": {
      const statusLabel = item.status.toLowerCase();
      const isFailure = item.status === "FAILURE";
      const isSuccess = item.status === "SUCCESS";
      return {
        who: "Pipeline",
        text: `${statusLabel} em ${item.repositoryName} (r${item.revision})`,
        sub: null,
        icon: isFailure ? (
          <X className="size-3.5" aria-hidden />
        ) : (
          <Activity className="size-3.5" aria-hidden />
        ),
        iconClassName: isFailure
          ? "bg-destructive-soft text-destructive"
          : isSuccess
            ? "bg-success-soft text-success"
            : "bg-brand-soft text-brand",
      };
    }
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
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2.5 pb-3">
        <CardSectionIcon>
          <Activity className="size-3.5" aria-hidden />
        </CardSectionIcon>
        <CardTitle>Feed de atividade</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-1">
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
              const { who, text, sub, icon, iconClassName } = getActivityPresentation(item);

              const content = (
                <>
                  <span
                    className={cn(
                      "flex size-[30px] shrink-0 items-center justify-center rounded-lg",
                      iconClassName,
                    )}
                  >
                    {icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-foreground">
                      <span className="font-semibold">{who}</span> {text}
                    </p>
                    {sub ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-foreground-subtle">
                      {formatRelativeTime(item.date)}
                    </p>
                  </div>
                </>
              );

              return (
                <div
                  key={`${item.kind}-${item.repositorySlug}-${item.date}-${item.kind === "pipeline" ? item.pipelineId : item.kind === "revision" ? item.revision : item.number}`}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {href ? (
                    <Link href={href} className="flex min-w-0 flex-1 gap-3 hover:opacity-90">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 gap-3">{content}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {feed.hasMore && onLoadMore ? (
          <div className="mt-4 pt-2">
            <Button
              variant="secondary"
              className="h-9 w-full border border-border"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
