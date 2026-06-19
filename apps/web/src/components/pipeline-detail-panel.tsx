"use client";

import type {
  JobLogChunk,
  PipelineDetail,
  PipelineJobStatus,
  PipelineRealtimeEvent,
} from "@svnhub/shared";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import {
  formatDuration,
  formatPipelineTrigger,
  PipelineStatusBadge,
} from "@/components/pipeline-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface PipelineDetailPanelProps {
  slug: string;
  pipeline: PipelineDetail;
  initialLogs: Record<string, JobLogChunk[]>;
}

function JobStatusIcon({ status }: { status: PipelineJobStatus }) {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle2 className="size-4 text-success" aria-hidden />;
    case "FAILURE":
      return <XCircle className="size-4 text-destructive" aria-hidden />;
    case "RUNNING":
      return <Loader2 className="size-4 animate-spin text-brand" aria-hidden />;
    case "QUEUED":
      return <Circle className="size-4 text-brand" aria-hidden />;
    case "CANCELED":
      return <Circle className="size-4 text-foreground-subtle" aria-hidden />;
  }
}

export function PipelineDetailPanel({
  slug,
  pipeline,
  initialLogs,
}: PipelineDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail] = useState(pipeline);
  const [logsByJob, setLogsByJob] = useState(initialLogs);
  const [activeJobId, setActiveJobId] = useState(pipeline.jobs[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLPreElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const socket = io(`${apiUrl}/pipelines`, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.emit("subscribe-pipeline", { pipelineId: detail.id });

    for (const job of detail.jobs) {
      socket.emit("subscribe-job", { jobId: job.id });
    }

    socket.on("pipeline-event", (event: PipelineRealtimeEvent) => {
      if (event.type === "log") {
        setLogsByJob((current) => {
          const existing = current[event.jobId] ?? [];
          return {
            ...current,
            [event.jobId]: [
              ...existing,
              {
                jobId: event.jobId,
                sequence: event.sequence,
                content: event.content,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
      }

      if (event.type === "status") {
        setDetail((current) => ({
          ...current,
          status: event.status,
          jobs: current.jobs.map((job) =>
            job.id === event.jobId && event.jobStatus
              ? { ...job, status: event.jobStatus }
              : job,
          ),
        }));
        if (!["RUNNING", "QUEUED", "PENDING"].includes(event.status)) {
          router.refresh();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [detail.id, detail.jobs, router]);

  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [logsByJob, activeJobId]);

  async function cancelPipeline() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/pipelines/${detail.id}/cancel`, {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar");
    } finally {
      setLoading(false);
    }
  }

  const activeLogs = logsByJob[activeJobId] ?? [];
  const canCancel = ["PENDING", "QUEUED", "RUNNING"].includes(detail.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Pipeline{" "}
              <span className="font-mono">r{detail.revision}</span>
              {" · "}
              <span className="font-mono text-base">{detail.branchPath}</span>
            </h2>
            <PipelineStatusBadge status={detail.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Gatilho {formatPipelineTrigger(detail.trigger)} · duração{" "}
            {formatDuration(detail.durationMs)}
          </p>
        </div>
        {canCancel ? (
          <Button size="sm" variant="outline" disabled={loading} onClick={cancelPipeline}>
            Cancelar
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            {detail.jobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setActiveJobId(job.id)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors",
                  activeJobId === job.id
                    ? "border border-primary bg-brand-soft/50"
                    : "border border-transparent hover:bg-accent/50",
                )}
              >
                <JobStatusIcon status={job.status} />
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  {job.stageName} / {job.name}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <pre
              ref={logContainerRef}
              className="max-h-[480px] overflow-auto bg-secondary p-4 font-mono text-xs leading-relaxed text-foreground"
            >
              {activeLogs.map((chunk) => chunk.content).join("") || "Aguardando logs..."}
            </pre>
          </CardContent>
        </Card>
      </div>

      {detail.artifacts.length > 0 ? (
        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Artefatos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {detail.artifacts.map((artifact) => (
                <li key={artifact.id}>
                  <code className="font-mono text-foreground">{artifact.name}</code> ·{" "}
                  {artifact.sizeBytes} bytes
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
