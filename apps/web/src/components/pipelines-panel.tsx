"use client";

import type { PipelineListResponse } from "@svnhub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatDuration,
  PipelineStatusBadge,
} from "@/components/pipeline-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Revisão</TableHead>
                <TableHead>Branch path</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initial.pipelines.map((pipeline) => (
                <TableRow key={pipeline.id}>
                  <TableCell>
                    <Link
                      href={`/repos/${slug}/pipelines/${pipeline.id}`}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      r{pipeline.revision}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1 font-mono text-xs">
                      {pipeline.branchPath}
                    </code>
                  </TableCell>
                  <TableCell>{pipeline.trigger}</TableCell>
                  <TableCell>
                    <PipelineStatusBadge status={pipeline.status} />
                  </TableCell>
                  <TableCell>{formatDuration(pipeline.durationMs)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(pipeline.createdAt).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
              {initial.pipelines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum pipeline executado ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
