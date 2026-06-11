"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";

import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { DashboardActivityFeed } from "@/components/dashboard-activity-feed";
import { DashboardPullRequests } from "@/components/dashboard-pull-requests";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
  DashboardResponse,
  RepositorySummary,
  UserHeatmapResponse,
} from "@svnhub/shared";

const ACTIVITY_PAGE_SIZE = 20;

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

  if (authLoading || (loading && !dashboard)) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]">
        <Skeleton className="h-96 w-full" />
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
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
      <div className="mx-auto max-w-7xl px-4 py-10">
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

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[280px_1fr]">
      <DashboardSidebar user={user} repositories={repositories} loading={loading && repositories.length === 0} />

      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Sua atividade recente, pull requests e pipelines.
          </p>
        </div>

        <ContributionHeatmap data={heatmap} loading={!heatmap} />

        <DashboardPullRequests
          authoredOpenPullRequests={dashboard.authoredOpenPullRequests}
          reviewRequestedPullRequests={dashboard.reviewRequestedPullRequests}
        />

        {dashboard.recentPipelines.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pipelines recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {dashboard.recentPipelines.map((pipeline) => (
                  <div key={pipeline.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/repos/${pipeline.repositorySlug}/pipelines/${pipeline.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {pipeline.repositoryName} · r{pipeline.revision}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pipeline.status} · {pipeline.trigger} ·{" "}
                      {new Date(pipeline.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

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
  );
}
