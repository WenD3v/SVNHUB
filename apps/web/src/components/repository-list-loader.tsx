"use client";

import Link from "next/link";
import { FolderGit2 } from "lucide-react";
import { useEffect, useState } from "react";

import { RepositoryList, type RepositoryListItem } from "@/components/repository-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { RefListResponse, RepositoryDetail, RepositorySummary } from "@svnhub/shared";

function RepositoryListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-full max-w-md" />
          <Skeleton className="mt-3 h-3 w-56" />
        </div>
      ))}
    </div>
  );
}

export function RepositoryListLoader() {
  const { user, loading: authLoading } = useAuth();
  const [repositories, setRepositories] = useState<RepositoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setRepositories([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiFetch<RepositorySummary[]>("/repositories")
      .then(async (summaries) => {
        const enriched = await Promise.all(
          summaries.map(async (summary): Promise<RepositoryListItem> => {
            try {
              const [detail, branches] = await Promise.all([
                apiFetch<RepositoryDetail>(`/repositories/${summary.slug}`),
                apiFetch<RefListResponse>(`/repositories/${summary.slug}/branches`).catch(
                  () => ({ refs: [] }),
                ),
              ]);
              return {
                ...summary,
                headRevision: detail.headRevision,
                healthStatus: detail.health.status,
                branchCount: branches.refs.length,
                updatedAt: detail.updatedAt,
              };
            } catch {
              return summary;
            }
          }),
        );
        if (!cancelled) {
          setRepositories(enriched);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Erro ao carregar repositórios",
          );
          setRepositories([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <RepositoryListSkeleton />;
  }

  if (!user) {
    return (
      <EmptyState
        icon={FolderGit2}
        title="Faça login para ver seus repositórios"
        description="Entre com sua conta para acessar a lista de repositórios."
        action={
          <Button asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        }
      />
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (repositories.length === 0) {
    return (
      <EmptyState
        icon={FolderGit2}
        title="Nenhum repositório ainda"
        description="Crie o primeiro repositório usando o formulário ao lado."
      />
    );
  }

  return <RepositoryList repositories={repositories} />;
}
