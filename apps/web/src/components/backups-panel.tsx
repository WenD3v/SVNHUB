"use client";

import type {
  BackupListResponse,
  InstanceSettingsSummary,
  RepositoryHealthSummary,
} from "@svnhub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { HealthStatusBadge } from "@/components/health-status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

interface BackupsPanelProps {
  slug: string;
  health: RepositoryHealthSummary;
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
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Backups e saúde</h3>
        <HealthStatusBadge status={health.status} />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {health.lastVerifiedAt
          ? `Última verificação: ${new Date(health.lastVerifiedAt).toLocaleString("pt-BR")}`
          : "Repositório ainda não verificado."}
        {health.lastError ? ` · Erro: ${health.lastError}` : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
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
        <form onSubmit={saveSettings} className="mt-6 space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium">Agendamento da instância</h4>
          <p className="text-xs text-muted-foreground">
            Cron de backup e verificação automática (admin da instância).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="backupCron" className="text-xs font-medium">
                Cron de backup
              </label>
              <input
                id="backupCron"
                value={backupCron}
                onChange={(event) => setBackupCron(event.target.value)}
                disabled={!user?.isAdmin || loading}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="verifyCron" className="text-xs font-medium">
                Cron de verificação
              </label>
              <input
                id="verifyCron"
                value={verifyCron}
                onChange={(event) => setVerifyCron(event.target.value)}
                disabled={!user?.isAdmin || loading}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="retentionCount" className="text-xs font-medium">
                Retenção (backups bem-sucedidos)
              </label>
              <input
                id="retentionCount"
                type="number"
                min={1}
                max={365}
                value={retentionCount}
                onChange={(event) => setRetentionCount(Number(event.target.value))}
                disabled={!user?.isAdmin || loading}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          {user?.isAdmin ? (
            <Button type="submit" size="sm" disabled={loading}>
              Salvar agendamento
            </Button>
          ) : settings ? (
            <p className="text-xs text-muted-foreground">
              Backup: {settings.backupCron} · Verificação: {settings.verifyCron} · Retenção:{" "}
              {settings.backupRetentionCount}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="mt-6 border-t border-border pt-4">
        <h4 className="text-sm font-medium">Histórico de backups</h4>
        <ul className="mt-2 divide-y divide-border text-sm">
          {(backups?.backups ?? []).map((backup) => (
            <li key={backup.id} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{backup.status}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(backup.createdAt).toLocaleString("pt-BR")}
                </span>
                <span className="text-xs text-muted-foreground">{formatBytes(backup.sizeBytes)}</span>
              </div>
              {backup.error ? (
                <p className="text-xs text-red-600">{backup.error}</p>
              ) : null}
            </li>
          ))}
          {(backups?.backups.length ?? 0) === 0 ? (
            <li className="py-2 text-muted-foreground">Nenhum backup registrado.</li>
          ) : null}
        </ul>
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <h4 className="text-sm font-medium text-red-700 dark:text-red-400">Recuperação (recover)</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Executa <code className="text-xs">svnadmin recover</code>. Requer papel Owner. Digite o slug
          do repositório para confirmar.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="confirmSlug" className="text-xs font-medium">
              Confirmar slug: {slug}
            </label>
            <input
              id="confirmSlug"
              value={confirmSlug}
              onChange={(event) => setConfirmSlug(event.target.value)}
              placeholder={slug}
              className="mt-1 w-full min-w-[200px] rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || confirmSlug !== slug}
            className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() =>
              void runAction(`/repositories/${slug}/recover`, { confirmSlug })
            }
          >
            Executar recover
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
