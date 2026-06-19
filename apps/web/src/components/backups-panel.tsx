"use client";

import type {
  BackupListResponse,
  InstanceSettingsSummary,
  RepositoryHealthSummary,
} from "@svnhub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Database, HeartPulse, History, RotateCcw } from "lucide-react";

import { HealthStatusBadge } from "@/components/health-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

interface BackupsPanelProps {
  slug: string;
  health: RepositoryHealthSummary;
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

function formatBytes(sizeBytes: string | null): string {
  if (!sizeBytes) {
    return "—";
  }
  const bytes = Number(sizeBytes);
  if (Number.isNaN(bytes)) {
    return sizeBytes;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function backupStatusVariant(status: string): "success" | "destructive" | "warning" | "muted" {
  const normalized = status.toLowerCase();
  if (normalized.includes("success") || normalized.includes("ok")) {
    return "success";
  }
  if (normalized.includes("fail") || normalized.includes("error")) {
    return "destructive";
  }
  if (normalized.includes("run") || normalized.includes("progress")) {
    return "warning";
  }
  return "muted";
}

export function BackupsPanel({ slug, health }: BackupsPanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupListResponse | null>(null);
  const [settings, setSettings] = useState<InstanceSettingsSummary | null>(null);
  const [backupCron, setBackupCron] = useState("");
  const [verifyCron, setVerifyCron] = useState("");
  const [retentionCount, setRetentionCount] = useState(7);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reloadBackups() {
    try {
      const data = await apiFetch<BackupListResponse>(`/repositories/${slug}/backups`);
      setBackups(data);
    } catch {
      setBackups({ backups: [], total: 0 });
    }
  }

  async function reloadSettings() {
    try {
      const data = await apiFetch<InstanceSettingsSummary>(
        `/repositories/${slug}/backup-settings`,
      );
      setSettings(data);
      setBackupCron(data.backupCron);
      setVerifyCron(data.verifyCron);
      setRetentionCount(data.backupRetentionCount);
    } catch {
      setSettings(null);
    }
  }

  useEffect(() => {
    void reloadBackups();
    void reloadSettings();
  }, [slug]);

  async function runAction(path: string, body?: unknown) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(path, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      await reloadBackups();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operação falhou");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.isAdmin) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await apiFetch<InstanceSettingsSummary>("/admin/settings/backups", {
        method: "PATCH",
        body: JSON.stringify({
          backupCron,
          verifyCron,
          backupRetentionCount: retentionCount,
        }),
      });
      setSettings(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SectionIcon>
              <Database className="size-4" aria-hidden />
            </SectionIcon>
            <div>
              <CardTitle>Backups e saúde</CardTitle>
              <CardDescription className="mt-1">
                Verificação de integridade e histórico de backups do repositório.
              </CardDescription>
            </div>
          </div>
          <HealthStatusBadge status={health.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <HeartPulse className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <p>
            {health.lastVerifiedAt
              ? `Última verificação: ${new Date(health.lastVerifiedAt).toLocaleString("pt-BR")}`
              : "Repositório ainda não verificado."}
            {health.lastError ? ` · Erro: ${health.lastError}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void runAction(`/repositories/${slug}/backups/run`)}
          >
            Executar backup
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void runAction(`/repositories/${slug}/verify`)}
          >
            Verificar integridade
          </Button>
        </div>

        {settings ? (
          <form onSubmit={saveSettings} className="space-y-4 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground">Agendamento da instância</h4>
            <p className="text-xs text-muted-foreground">
              Cron de backup e verificação automática (admin da instância).
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="backupCron">Cron de backup</Label>
                <Input
                  id="backupCron"
                  value={backupCron}
                  onChange={(event) => setBackupCron(event.target.value)}
                  disabled={!user?.isAdmin || loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifyCron">Cron de verificação</Label>
                <Input
                  id="verifyCron"
                  value={verifyCron}
                  onChange={(event) => setVerifyCron(event.target.value)}
                  disabled={!user?.isAdmin || loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retentionCount">Retenção (backups bem-sucedidos)</Label>
                <Input
                  id="retentionCount"
                  type="number"
                  min={1}
                  max={365}
                  value={retentionCount}
                  onChange={(event) => setRetentionCount(Number(event.target.value))}
                  disabled={!user?.isAdmin || loading}
                />
              </div>
            </div>
            {user?.isAdmin ? (
              <Button type="submit" size="sm" disabled={loading}>
                Salvar agendamento
              </Button>
            ) : settings ? (
              <p className="text-xs text-foreground-subtle">
                Backup: {settings.backupCron} · Verificação: {settings.verifyCron} · Retenção:{" "}
                {settings.backupRetentionCount}
              </p>
            ) : null}
          </form>
        ) : null}

        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2">
            <SectionIcon>
              <History className="size-4" aria-hidden />
            </SectionIcon>
            <h4 className="text-sm font-semibold text-foreground">Histórico de backups</h4>
          </div>
          <ul className="divide-y divide-border text-sm">
            {(backups?.backups ?? []).map((backup) => (
              <li key={backup.id} className="flex flex-wrap items-center gap-2 py-3">
                <Badge variant={backupStatusVariant(backup.status)}>{backup.status}</Badge>
                <span className="text-xs text-foreground-subtle">
                  {new Date(backup.createdAt).toLocaleString("pt-BR")}
                </span>
                <span className="text-xs text-muted-foreground">{formatBytes(backup.sizeBytes)}</span>
                {backup.error ? (
                  <span className="w-full text-xs text-destructive">{backup.error}</span>
                ) : null}
              </li>
            ))}
            {(backups?.backups.length ?? 0) === 0 ? (
              <li className="py-3 text-muted-foreground">Nenhum backup registrado.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-md border border-destructive/30 bg-destructive-soft/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <SectionIcon>
              <RotateCcw className="size-4 text-destructive" aria-hidden />
            </SectionIcon>
            <h4 className="text-sm font-semibold text-destructive">Recuperação (recover)</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Executa <code className="font-mono text-xs">svnadmin recover</code>. Requer papel Owner.
            Digite o slug do repositório para confirmar.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="confirmSlug">Confirmar slug: {slug}</Label>
              <Input
                id="confirmSlug"
                value={confirmSlug}
                onChange={(event) => setConfirmSlug(event.target.value)}
                placeholder={slug}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || confirmSlug !== slug}
              className="shrink-0 border-destructive text-destructive hover:bg-destructive-soft"
              onClick={() => void runAction(`/repositories/${slug}/recover`, { confirmSlug })}
            >
              Executar recover
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
