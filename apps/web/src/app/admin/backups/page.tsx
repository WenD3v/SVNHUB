"use client";

import type { InstanceSettingsSummary } from "@svnhub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminNav } from "@/components/admin-nav";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

export default function AdminBackupsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [settings, setSettings] = useState<InstanceSettingsSummary | null>(null);
  const [backupCron, setBackupCron] = useState("");
  const [verifyCron, setVerifyCron] = useState("");
  const [retentionCount, setRetentionCount] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user && !user.isAdmin) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    void apiFetch<InstanceSettingsSummary>("/admin/settings/backups")
      .then((data) => {
        setSettings(data);
        setBackupCron(data.backupCron);
        setVerifyCron(data.verifyCron);
        setRetentionCount(data.backupRetentionCount);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar configurações");
      });
  }, [user?.isAdmin]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await apiFetch<InstanceSettingsSummary>("/admin/settings/backups", {
        method: "PATCH",
        body: JSON.stringify({
          backupCron,
          verifyCron,
          backupRetentionCount: retentionCount,
        }),
      });
      setSettings(data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user?.isAdmin) {
    return (
      <PageShell>
        <section className="mx-auto max-w-7xl space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Backups</h1>
            <p className="text-sm text-muted-foreground">
              Configurações globais de agendamento. Backups por repositório ficam em Settings.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Início</Link>
          </Button>
        </div>

        <AdminNav />

        <div className="max-w-xl space-y-4 rounded-lg border border-border p-4">
          <div className="space-y-1">
            <Label htmlFor="backup-cron">Cron de backup</Label>
            <Input
              id="backup-cron"
              value={backupCron}
              onChange={(e) => setBackupCron(e.target.value)}
              placeholder={settings?.backupCron ?? "0 2 * * *"}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="verify-cron">Cron de verificação</Label>
            <Input
              id="verify-cron"
              value={verifyCron}
              onChange={(e) => setVerifyCron(e.target.value)}
              placeholder={settings?.verifyCron ?? "0 4 * * 0"}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="retention">Retenção (quantidade)</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              max={365}
              value={retentionCount}
              onChange={(e) => setRetentionCount(Number(e.target.value))}
            />
          </div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            Salvar
          </Button>
          {saved ? (
            <Alert>
              <AlertDescription>Configurações salvas.</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
