"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  FolderGit2,
  GitPullRequest,
  LayoutDashboard,
  Plus,
  Search,
  Workflow,
} from "lucide-react";

import { CreateRepositoryForm } from "@/components/create-repository-form";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { DashboardActivityFeed } from "@/components/dashboard-activity-feed";
import { DashboardPullRequests } from "@/components/dashboard-pull-requests";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
  DashboardPipelineSummary,
  DashboardResponse,
  PipelineStatus,
  PipelineTrigger,
  RepositorySummary,
  UserHeatmapResponse,
} from "@svnhub/shared";

const ACTIVITY_PAGE_SIZE = 20;

type StatSubColor = "foreground-subtle" | "brand" | "success" | "destructive";

interface DashboardStat {
  label: string;
  value: string;
  sub: string;
  subColor: StatSubColor;
  icon: React.ReactNode;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Bom dia";
  }
  if (hour < 18) {
    return "Boa tarde";
  }
  return "Boa noite";
}

function isToday(date: string): boolean {
  const value = new Date(date);
  const now = new Date();
  return (
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate()
  );
}

function sumWeekCommits(heatmap: UserHeatmapResponse | null): number {
  if (!heatmap?.days.length) {
    return 0;
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);

  return heatmap.days.reduce((total, day) => {
    if (new Date(day.date) >= cutoff) {
      return total + day.count;
    }
    return total;
  }, 0);
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
  return `há ${days} d`;
}

function formatTriggerLabel(trigger: PipelineTrigger): string {
  switch (trigger) {
    case "PUSH":
      return "commit";
    case "PR":
      return "pull request";
    case "MANUAL":
      return "manual";
  }
}

function getPipelinePresentation(status: PipelineStatus): {
  dotClassName: string;
  badgeVariant: "success" | "brand" | "destructive" | "warning" | "muted";
  label: string;
  pulse: boolean;
} {
  switch (status) {
    case "SUCCESS":
      return {
        dotClassName: "bg-success",
        badgeVariant: "success",
        label: "Sucesso",
        pulse: false,
      };
    case "RUNNING":
      return {
        dotClassName: "bg-brand",
        badgeVariant: "brand",
        label: "Rodando",
        pulse: true,
      };
    case "FAILURE":
      return {
        dotClassName: "bg-destructive",
        badgeVariant: "destructive",
        label: "Falhou",
        pulse: false,
      };
    case "QUEUED":
      return {
        dotClassName: "bg-brand",
        badgeVariant: "brand",
        label: "Na fila",
        pulse: true,
      };
    case "PENDING":
      return {
        dotClassName: "bg-foreground-subtle",
        badgeVariant: "muted",
        label: "Pendente",
        pulse: false,
      };
    case "CANCELED":
      return {
        dotClassName: "bg-foreground-subtle",
        badgeVariant: "muted",
        label: "Cancelado",
        pulse: false,
      };
  }
}

function CardSectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

function StatCard({ stat }: { stat: DashboardStat }) {
  const subColorClass =
    stat.subColor === "brand"
      ? "text-brand"
      : stat.subColor === "success"
        ? "text-success"
        : stat.subColor === "destructive"
          ? "text-destructive"
          : "text-foreground-subtle";

  return (
    <div className="rounded-lg border border-border bg-card px-[18px] py-4 shadow-[var(--card-shadow)]">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="inline-flex size-[26px] items-center justify-center rounded-lg bg-brand-soft text-brand">
          {stat.icon}
        </span>
        {stat.label}
      </div>
      <p className="mt-2.5 font-display text-[28px] font-bold leading-none tracking-tight text-foreground">
        {stat.value}
      </p>
      <p className={cn("mt-1.5 text-[11.5px] font-medium", subColorClass)}>{stat.sub}</p>
    </div>
  );
}

function DashboardProfileCard({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3.5">
          <UserAvatar
            username={user.username}
            avatarUrl={user.avatarUrl}
            brandFallback
            className="size-[54px] text-xl"
          />
          <div className="min-w-0">
            <Link
              href={`/users/${encodeURIComponent(user.username)}`}
              className="block truncate font-display text-base font-semibold text-foreground hover:text-brand"
            >
              {user.displayName ?? user.username}
            </Link>
            <p className="truncate text-[13px] text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        {user.isAdmin ? (
          <Badge variant="brand" className="mt-3.5">
            Administrador
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DashboardRepositoriesCard({
  repositories,
  loading,
}: {
  repositories: RepositorySummary[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredRepositories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return repositories;
    }
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.slug.toLowerCase().includes(term) ||
        (repo.description?.toLowerCase().includes(term) ?? false),
    );
  }, [repositories, search]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2.5 pb-3">
        <CardTitle>Repositórios</CardTitle>
        <Link href="/repos" className="ml-auto text-xs font-medium text-brand hover:underline">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-subtle"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar repositórios…"
            className="h-8 pl-8 text-xs"
            aria-label="Filtrar repositórios"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : filteredRepositories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {repositories.length === 0
              ? "Nenhum repositório acessível."
              : "Nenhum repositório corresponde à busca."}
          </p>
        ) : (
          <nav className="max-h-80 space-y-px overflow-y-auto pr-1">
            {filteredRepositories.map((repo) => (
              <Link
                key={repo.id}
                href={`/repos/${repo.slug}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-foreground hover:bg-accent"
              >
                <FolderGit2 className="size-[15px] shrink-0 text-foreground-subtle" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{repo.name}</span>
                <span className="shrink-0 font-mono text-[10.5px] text-foreground-subtle">
                  {repo.defaultBranch}
                </span>
              </Link>
            ))}
          </nav>
        )}
      </CardContent>
    </Card>
  );
}

function RecentPipelinesCard({ pipelines }: { pipelines: DashboardPipelineSummary[] }) {
  if (pipelines.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center gap-2.5 pb-3">
        <CardSectionIcon>
          <Workflow className="size-3.5" aria-hidden />
        </CardSectionIcon>
        <CardTitle>Pipelines recentes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {pipelines.map((pipeline) => {
            const presentation = getPipelinePresentation(pipeline.status);

            return (
              <div key={pipeline.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "inline-flex size-[9px] shrink-0 rounded-full",
                    presentation.dotClassName,
                    presentation.pulse && "animate-[svnpulse_1.2s_ease-in-out_infinite]",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/repos/${pipeline.repositorySlug}/pipelines/${pipeline.id}`}
                    className="text-[13.5px] font-semibold text-foreground hover:text-brand"
                  >
                    {pipeline.repositoryName} ·{" "}
                    <span className="font-mono font-medium">r{pipeline.revision}</span>
                  </Link>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {formatTriggerLabel(pipeline.trigger)} · {formatRelativeTime(pipeline.createdAt)}
                  </p>
                </div>
                <Badge variant={presentation.badgeVariant} className="shrink-0 font-semibold">
                  {presentation.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardHome() {
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [heatmap, setHeatmap] = useState<UserHeatmapResponse | null>(null);
  const [activityOffset, setActivityOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (offset = 0, append = false) => {
    if (!user) {
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const [dashboardData, repoData, heatmapData] = await Promise.all([
        apiFetch<DashboardResponse>(
          `/dashboard?limit=${ACTIVITY_PAGE_SIZE}&offset=${offset}`,
        ),
        append ? Promise.resolve(null) : apiFetch<RepositorySummary[]>("/repositories"),
        append
          ? Promise.resolve(null)
          : apiFetch<UserHeatmapResponse>(
              `/users/${encodeURIComponent(user.username)}/stats/heatmap`,
            ).catch(() => ({ days: [], total: 0 })),
      ]);

      setDashboard((current) => {
        if (!append || !current) {
          return dashboardData;
        }
        return {
          ...dashboardData,
          activityFeed: {
            ...dashboardData.activityFeed,
            items: [...current.activityFeed.items, ...dashboardData.activityFeed.items],
          },
        };
      });

      if (repoData) {
        setRepositories(repoData);
      }
      if (heatmapData) {
        setHeatmap(heatmapData);
      }
      setActivityOffset(offset);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Erro ao carregar o dashboard",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    void loadDashboard(0, false);
  }, [authLoading, user, loadDashboard]);

  const stats = useMemo((): DashboardStat[] => {
    if (!dashboard) {
      return [];
    }

    const pipelinesToday = dashboard.recentPipelines.filter((pipeline) =>
      isToday(pipeline.createdAt),
    );
    const failedToday = pipelinesToday.filter((pipeline) => pipeline.status === "FAILURE").length;
    const weekCommits = sumWeekCommits(heatmap);
    const reviewCount = dashboard.reviewRequestedPullRequests.length;

    return [
      {
        label: "Repositórios",
        value: String(repositories.length),
        sub: repositories.length === 1 ? "1 repositório acessível" : `${repositories.length} acessíveis`,
        subColor: "foreground-subtle",
        icon: <FolderGit2 className="size-3.5" aria-hidden />,
      },
      {
        label: "PRs abertas",
        value: String(dashboard.authoredOpenPullRequests.length),
        sub:
          reviewCount > 0
            ? `${reviewCount} aguarda${reviewCount === 1 ? "" : "m"} você`
            : "Nenhuma aguardando review",
        subColor: reviewCount > 0 ? "brand" : "foreground-subtle",
        icon: <GitPullRequest className="size-3.5" aria-hidden />,
      },
      {
        label: "Pipelines hoje",
        value: String(pipelinesToday.length),
        sub: failedToday > 0 ? `${failedToday} falhou${failedToday === 1 ? "" : "ram"}` : "Nenhuma falha hoje",
        subColor: failedToday > 0 ? "destructive" : "foreground-subtle",
        icon: <Workflow className="size-3.5" aria-hidden />,
      },
      {
        label: "Commits / semana",
        value: String(weekCommits),
        sub: heatmap?.total ? `${heatmap.total.toLocaleString("pt-BR")} no último ano` : "Sem histórico",
        subColor: weekCommits > 0 ? "success" : "foreground-subtle",
        icon: <Activity className="size-3.5" aria-hidden />,
      },
    ];
  }, [dashboard, heatmap, repositories.length]);

  if (authLoading || (loading && !dashboard)) {
    return (
      <div className="mx-auto max-w-[1240px] space-y-6 px-7 py-8">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="h-96 w-full" />
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-[1240px] px-7 py-10">
        <EmptyState
          icon={LayoutDashboard}
          title="Faça login para ver seu dashboard"
          description="Entre com sua conta para acessar a visão geral da instância."
          action={
            <Button asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="mx-auto max-w-[1240px] px-7 py-10">
        <EmptyState
          icon={LayoutDashboard}
          title="Não foi possível carregar o dashboard"
          description={error ?? "Tente novamente em instantes."}
          action={
            <Button onClick={() => void loadDashboard(0, false)}>Tentar novamente</Button>
          }
        />
      </div>
    );
  }

  const displayName = user.displayName ?? user.username;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 px-7 py-8 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Visão geral
          </p>
          <h1 className="font-display text-[30px] font-bold tracking-tight text-foreground">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sua atividade recente, pull requests e pipelines em um só lugar.
          </p>
        </div>

        {user.isAdmin ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-[38px] shadow-sm">
                <Plus className="size-3.5" aria-hidden />
                Novo repositório
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo repositório</DialogTitle>
              </DialogHeader>
              <CreateRepositoryForm />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-6 lg:sticky lg:top-28">
          <DashboardProfileCard user={user} />
          <DashboardRepositoriesCard
            repositories={repositories}
            loading={loading && repositories.length === 0}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <ContributionHeatmap data={heatmap} loading={!heatmap} />

          <DashboardPullRequests
            authoredOpenPullRequests={dashboard.authoredOpenPullRequests}
            reviewRequestedPullRequests={dashboard.reviewRequestedPullRequests}
          />

          <RecentPipelinesCard pipelines={dashboard.recentPipelines} />

          <DashboardActivityFeed
            feed={dashboard.activityFeed}
            loadingMore={loadingMore}
            onLoadMore={() => {
              const nextOffset = activityOffset + ACTIVITY_PAGE_SIZE;
              void loadDashboard(nextOffset, true);
            }}
          />
        </div>
      </div>
    </div>
  );
}
