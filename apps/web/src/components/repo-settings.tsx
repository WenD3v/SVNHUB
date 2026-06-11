"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { RepoPolicySettings } from "@svnhub/shared";

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
    <div className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="font-medium">Proteção de paths (pre-commit)</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={policy.blockTrunkDirectCommit}
          onChange={(e) =>
            setPolicy({ ...policy, blockTrunkDirectCommit: e.target.checked })
          }
        />
        Bloquear commit direto em main (/trunk)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={policy.blockTagsWrite}
          onChange={(e) => setPolicy({ ...policy, blockTagsWrite: e.target.checked })}
        />
        Bloquear escrita em /tags/*
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={policy.requireCommitMessage}
          onChange={(e) =>
            setPolicy({ ...policy, requireCommitMessage: e.target.checked })
          }
        />
        Mensagem de commit obrigatória
      </label>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Regex da mensagem (opcional)</label>
        <input
          className="h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
          value={policy.commitMessageRegex ?? ""}
          onChange={(e) =>
            setPolicy({ ...policy, commitMessageRegex: e.target.value || null })
          }
          placeholder="^\\[SVNHUB-\\d+\\]"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Aprovações mínimas para merge de PR</label>
        <input
          type="number"
          min={0}
          className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
          value={policy.minApprovals}
          onChange={(e) =>
            setPolicy({
              ...policy,
              minApprovals: Number(e.target.value) || 0,
            })
          }
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Tamanho máximo de arquivo (bytes)</label>
        <input
          type="number"
          className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
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
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
