"use client";

import type {
  JobLogChunk,
  PipelineDetail,
  PipelineRealtimeEvent,
} from "@svnhub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import {
  formatDuration,
  PipelineJobStatusBadge,
  PipelineStatusBadge,
} from "@/components/pipeline-status-badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface PipelineDetailPanelProps {
  slug: string;
  pipeline: PipelineDetail;
  initialLogs: Record<string, JobLogChunk[]>;
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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              Pipeline r{detail.revision} · {detail.branchPath}
            </h2>
            <PipelineStatusBadge status={detail.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Gatilho {detail.trigger} · duração {formatDuration(detail.durationMs)}
          </p>
        </div>
        {canCancel ? (
          <Button size="sm" variant="outline" disabled={loading} onClick={cancelPipeline}>
            Cancelar
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="space-y-2 rounded-lg border border-border p-3">
          <h3 className="text-sm font-medium">Jobs</h3>
          {detail.jobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setActiveJobId(job.id)}
              className={
                activeJobId === job.id
                  ? "flex w-full flex-col rounded-md border border-primary bg-muted/40 px-3 py-2 text-left"
                  : "flex w-full flex-col rounded-md border border-transparent px-3 py-2 text-left hover:bg-muted/30"
              }
            >
              <span className="text-sm font-medium">
                {job.stageName} / {job.name}
              </span>
              <PipelineJobStatusBadge status={job.status} />
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-2 text-sm font-medium">Logs</div>
          <pre
            ref={logContainerRef}
            className="max-h-[480px] overflow-auto bg-black p-4 font-mono text-xs text-green-200"
          >
            {activeLogs.map((chunk) => chunk.content).join("") || "Aguardando logs..."}
          </pre>
        </div>
      </div>

      {detail.artifacts.length > 0 ? (
        <div className="rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium">Artefatos</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {detail.artifacts.map((artifact) => (
              <li key={artifact.id}>
                <code>{artifact.name}</code> · {artifact.sizeBytes} bytes
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
