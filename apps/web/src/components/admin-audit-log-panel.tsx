"use client";

import type { AuditLogDomain, AuditLogResponse } from "@svnhub/shared";
import { AUDIT_LOG_DOMAINS } from "@svnhub/shared/permissions";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";

const PAGE_SIZE = 50;

const DOMAIN_LABELS: Record<AuditLogDomain, string> = {
  users: "Usuários",
  teams: "Teams",
  issues: "Issues",
  avatar: "Avatar",
  notifications: "Notificações",
  repositories: "Repositórios",
  auth: "Autenticação",
  other: "Outros",
};

export function AdminAuditLogPanel() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [domain, setDomain] = useState<AuditLogDomain | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(pageOffset: number, selectedDomain: AuditLogDomain | "all") {
    setLoading(true);
    setError(null);
    try {
      const domainQuery =
        selectedDomain === "all" ? "" : `&domain=${encodeURIComponent(selectedDomain)}`;
      const response = await apiFetch<AuditLogResponse>(
        `/admin/audit-log?limit=${PAGE_SIZE}&offset=${pageOffset}${domainQuery}`,
      );
      setData(response);
      setOffset(pageOffset);
      setDomain(selectedDomain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar auditoria");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(0, "all");
  }, []);

  const total = data?.total ?? 0;
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={domain === "all" ? "default" : "outline"}
          onClick={() => void load(0, "all")}
        >
          Todos
        </Button>
        {AUDIT_LOG_DOMAINS.map((entry) => (
          <Button
            key={entry}
            size="sm"
            variant={domain === entry ? "default" : "outline"}
            onClick={() => void load(0, entry)}
          >
            {DOMAIN_LABELS[entry]}
          </Button>
        ))}
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {(data?.entries ?? []).map((entry) => (
          <div key={entry.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{entry.action}</span>
              <span className="text-muted-foreground">
                {entry.resourceType}
                {entry.resourceId ? ` / ${entry.resourceId}` : ""}
              </span>
              {entry.repositorySlug ? (
                <span className="text-xs text-muted-foreground">· {entry.repositorySlug}</span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {entry.username ?? "sistema"} · {new Date(entry.createdAt).toLocaleString("pt-BR")}
            </p>
            {entry.metadata ? (
              <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs text-muted-foreground">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
        {(data?.entries.length ?? 0) === 0 && !loading ? (
          <p className="px-4 py-8 text-center text-muted-foreground">Nenhum evento registrado.</p>
        ) : null}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? `Mostrando ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} de ${total}`
            : "0 eventos"}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrev || loading}
            onClick={() => void load(Math.max(0, offset - PAGE_SIZE), domain)}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNext || loading}
            onClick={() => void load(offset + PAGE_SIZE, domain)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
