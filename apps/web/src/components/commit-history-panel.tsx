"use client";

import { useState } from "react";

import { CommitHistory } from "@/components/commit-history";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { RepositoryLogResponse, SvnLogEntry } from "@svnhub/shared";

interface CommitHistoryPanelProps {
  slug: string;
  initialEntries: SvnLogEntry[];
  initialHasMore: boolean;
  queryString: string;
}

export function CommitHistoryPanel({
  slug,
  initialEntries,
  initialHasMore,
  queryString,
}: CommitHistoryPanelProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(queryString);
      params.set("offset", String(entries.length));
      const response = await apiFetch<RepositoryLogResponse>(
        `/repositories/${slug}/log?${params.toString()}`,
      );
      setEntries((current) => [...current, ...response.entries]);
      setHasMore(response.hasMore);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar commits");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <CommitHistory slug={slug} entries={entries} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
