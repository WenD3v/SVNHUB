"use client";

import type { PipelineListResponse } from "@svnhub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCode2, Workflow } from "lucide-react";
import { useState } from "react";

import {
  formatDuration,
  formatPipelineTrigger,
  PipelineStatusBadge,
  PipelineStatusDot,
} from "@/components/pipeline-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <FileCode2 className="size-3.5 text-foreground-subtle" aria-hidden />
          {initial.total} execução(ões) · disparo automático via{" "}
          <code className="rounded bg-secondary px-1.5 py-px font-mono text-foreground">
            .svnhub-ci.yml
          </code>
        </p>
        <Button size="sm" disabled={loading} onClick={runPipeline}>
          Rodar pipeline
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {initial.pipelines.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                icon={Workflow}
                title="Nenhum pipeline"
                description="Nenhum pipeline executado ainda."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {initial.pipelines.map((pipeline) => (
                <div
                  key={pipeline.id}
                  className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-accent/30"
                >
                  <PipelineStatusDot status={pipeline.status} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/repos/${slug}/pipelines/${pipeline.id}`}
                      className="text-[13.5px] font-semibold text-foreground hover:text-brand"
                    >
                      <span className="font-mono">{pipeline.branchPath}</span>
                      {" · "}
                      <span className="font-mono font-medium">r{pipeline.revision}</span>
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {formatPipelineTrigger(pipeline.trigger)} ·{" "}
                      {formatDuration(pipeline.durationMs)} ·{" "}
                      {new Date(pipeline.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <PipelineStatusBadge status={pipeline.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
