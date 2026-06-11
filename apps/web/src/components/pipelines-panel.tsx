"use client";

import type { PipelineListResponse } from "@svnhub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatDuration,
  PipelineStatusBadge,
} from "@/components/pipeline-status-badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface PipelinesPanelProps {
  slug: string;
  initial: PipelineListResponse;
}

export function PipelinesPanel({ slug, initial }: PipelinesPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runPipeline() {
    setLoading(true);
    setError(null);
    try {
      const pipeline = await apiFetch<{ id: string }>(`/repositories/${slug}/pipelines`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/repos/${slug}/pipelines/${pipeline.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar pipeline");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {initial.total} execução(ões) · disparo automático via `.svnhub-ci.yml`
        </p>
        <Button size="sm" disabled={loading} onClick={runPipeline}>
          Rodar pipeline
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Revisão</th>
              <th className="px-4 py-2">Branch path</th>
              <th className="px-4 py-2">Gatilho</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Duração</th>
              <th className="px-4 py-2">Criado</th>
            </tr>
          </thead>
          <tbody>
            {initial.pipelines.map((pipeline) => (
              <tr key={pipeline.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/repos/${slug}/pipelines/${pipeline.id}`}
                    className="font-medium hover:underline"
                  >
                    r{pipeline.revision}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">{pipeline.branchPath}</code>
                </td>
                <td className="px-4 py-3">{pipeline.trigger}</td>
                <td className="px-4 py-3">
                  <PipelineStatusBadge status={pipeline.status} />
                </td>
                <td className="px-4 py-3">{formatDuration(pipeline.durationMs)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(pipeline.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {initial.pipelines.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Nenhum pipeline executado ainda.
          </p>
        ) : null}
      </div>
    </div>
  );
}
