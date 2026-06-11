"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FolderGit2 } from "lucide-react";

import { CreateRepositoryForm } from "@/components/create-repository-form";
import { PageShell } from "@/components/page-shell";
import { RepositoryList, type RepositoryListItem } from "@/components/repository-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function ReposPage() {
  const { user, loading: authLoading } = useAuth();
  const [repositories, setRepositories] = useState<RepositoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

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

  const filteredRepositories = useMemo(() => {
    const term = nameFilter.trim().toLowerCase();
    return repositories.filter((repo) => {
      if (!showArchived && repo.isArchived) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        repo.name.toLowerCase().includes(term) ||
        repo.slug.toLowerCase().includes(term) ||
        (repo.description?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [repositories, nameFilter, showArchived]);

  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repositórios</h1>
            <p className="text-sm text-muted-foreground">
              Lista completa de repositórios acessíveis com filtros.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="repo-name-filter">Nome</Label>
              <Input
                id="repo-name-filter"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Filtrar por nome, slug ou descrição…"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
                className="size-4 rounded border border-input"
              />
              Mostrar arquivados
            </label>
          </div>

          {authLoading || loading ? (
            <RepositoryListSkeleton />
          ) : !user ? (
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
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filteredRepositories.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title="Nenhum repositório encontrado"
              description={
                repositories.length === 0
                  ? "Você ainda não tem repositórios acessíveis."
                  : "Ajuste os filtros para ver mais resultados."
              }
            />
          ) : (
            <RepositoryList repositories={filteredRepositories} />
          )}
        </div>

        {user?.isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo repositório</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateRepositoryForm />
            </CardContent>
          </Card>
        ) : null}
      </section>
    </PageShell>
  );
}
