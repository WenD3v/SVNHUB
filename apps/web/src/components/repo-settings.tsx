"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Settings2,
  Shield,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { RepoPolicySettings, RepositoryDetail } from "@svnhub/shared";

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

function PolicyToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-md py-1 text-sm text-foreground"
    >
      <span>{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-4 rounded-full bg-card shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </label>
  );
}

interface RepoGeneralSettingsProps {
  repo: RepositoryDetail;
}

export function RepoGeneralSettings({ repo }: RepoGeneralSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SectionIcon>
            <Settings2 className="size-4" aria-hidden />
          </SectionIcon>
          <CardTitle>Geral</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="repo-name">Nome do repositório</Label>
          <Input
            id="repo-name"
            value={repo.name}
            readOnly
            className="font-mono"
            aria-readonly
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repo-description">Descrição</Label>
          <textarea
            id="repo-description"
            value={repo.description ?? ""}
            readOnly
            rows={3}
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-readonly
          />
        </div>
        <div className="space-y-2">
          <Label>Visibilidade</Label>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-primary bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
              <span className="size-3.5 rounded-full border-[4px] border-primary" aria-hidden />
              Privado
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground">
              <span
                className="size-3.5 rounded-full border border-border-strong"
                aria-hidden
              />
              Público
            </span>
          </div>
          <p className="text-xs text-foreground-subtle">
            A visibilidade é gerenciada pelo administrador da instância.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface PolicyFormProps {
  slug: string;
  initial: RepoPolicySettings;
}

export function PolicyForm({ slug, initial }: PolicyFormProps) {
  const router = useRouter();
  const [policy, setPolicy] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/repositories/${slug}/settings/policies`, {
        method: "PATCH",
        body: JSON.stringify(policy),
      });
      setMessage("Políticas salvas.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SectionIcon>
            <Shield className="size-4" aria-hidden />
          </SectionIcon>
          <div>
            <CardTitle>Proteção de paths (pre-commit)</CardTitle>
            <CardDescription className="mt-1">
              Regras aplicadas antes de aceitar commits no servidor SVN.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-3">
          <PolicyToggle
            id="block-trunk"
            label="Bloquear commit direto em main (/trunk)"
            checked={policy.blockTrunkDirectCommit}
            onChange={(checked) =>
              setPolicy({ ...policy, blockTrunkDirectCommit: checked })
            }
          />
          <PolicyToggle
            id="block-tags"
            label="Bloquear escrita em /tags/*"
            checked={policy.blockTagsWrite}
            onChange={(checked) => setPolicy({ ...policy, blockTagsWrite: checked })}
          />
          <PolicyToggle
            id="require-message"
            label="Mensagem de commit obrigatória"
            checked={policy.requireCommitMessage}
            onChange={(checked) =>
              setPolicy({ ...policy, requireCommitMessage: checked })
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="commit-regex">Regex da mensagem (opcional)</Label>
            <Input
              id="commit-regex"
              className="font-mono text-sm"
              value={policy.commitMessageRegex ?? ""}
              onChange={(e) =>
                setPolicy({ ...policy, commitMessageRegex: e.target.value || null })
              }
              placeholder="^\\[SVNHUB-\\d+\\]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-approvals">Aprovações mínimas p/ merge de PR</Label>
            <Input
              id="min-approvals"
              type="number"
              min={0}
              value={policy.minApprovals}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  minApprovals: Number(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-file-size">Tamanho máximo de arquivo (bytes)</Label>
          <Input
            id="max-file-size"
            type="number"
            className="max-w-xs"
            value={policy.maxFileSizeBytes ?? ""}
            onChange={(e) =>
              setPolicy({
                ...policy,
                maxFileSizeBytes: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando…" : "Salvar políticas"}
        </Button>
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface RepoDangerZoneProps {
  slug: string;
  isArchived: boolean;
}

export function RepoDangerZone({ slug, isArchived }: RepoDangerZoneProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"archive" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    if (!window.confirm("Arquivar este repositório? Ele ficará somente-leitura.")) {
      return;
    }
    setLoading("archive");
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/archive`, { method: "PATCH" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Excluir permanentemente este repositório? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }
    setLoading("delete");
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}`, { method: "DELETE" });
      router.push("/repos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="border-destructive bg-destructive-soft/30">
      <CardHeader className="border-destructive/20 bg-destructive-soft/50">
        <div className="flex items-center gap-2">
          <SectionIcon>
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
          </SectionIcon>
          <CardTitle className="text-destructive">Zona de perigo</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Arquivar repositório</p>
            <p className="text-xs text-muted-foreground">
              Torna o repositório somente-leitura.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isArchived || loading !== null}
            className="shrink-0 border-destructive text-destructive hover:bg-destructive-soft"
            onClick={() => void handleArchive()}
          >
            <Archive className="size-4" aria-hidden />
            {loading === "archive" ? "Arquivando…" : isArchived ? "Arquivado" : "Arquivar"}
          </Button>
        </div>
        <div className="border-t border-destructive/20 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Excluir repositório</p>
              <p className="text-xs text-muted-foreground">
                Ação permanente. Não pode ser desfeita.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading !== null}
              className="shrink-0"
              onClick={() => void handleDelete()}
            >
              <Trash2 className="size-4" aria-hidden />
              {loading === "delete" ? "Excluindo…" : "Excluir repositório"}
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
