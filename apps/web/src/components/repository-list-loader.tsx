"use client";

import { useEffect, useState } from "react";

import { RepositoryList } from "@/components/repository-list";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { RepositorySummary } from "@svnhub/shared";

export function RepositoryListLoader() {
  const { user, loading: authLoading } = useAuth();
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
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
      .then((data) => {
        if (!cancelled) {
          setRepositories(data);
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
    return (
      <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Carregando repositórios…
      </p>
    );
  }

  if (!user) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Faça login para ver seus repositórios.
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return <RepositoryList repositories={repositories} />;
}
