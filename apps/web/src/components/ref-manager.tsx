"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface CreateRefFormProps {
  slug: string;
  kind: "branch" | "tag";
}

export function CreateRefForm({ slug, kind }: CreateRefFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceRef, setSourceRef] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        kind === "branch"
          ? `/repositories/${slug}/branches`
          : `/repositories/${slug}/tags`;
      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ name, sourceRef }),
      });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setLoading(false);
    }
  }

  const label = kind === "branch" ? "branch" : "tag";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Nome da {label}</label>
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "branch" ? "feature-x" : "v1.0.0"}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Origem</label>
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={sourceRef}
          onChange={(e) => setSourceRef(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Criando…" : `Criar ${label}`}
      </Button>
      {error ? <p className="w-full text-sm text-red-400">{error}</p> : null}
    </form>
  );
}

interface DeleteRefButtonProps {
  slug: string;
  name: string;
  kind: "branch" | "tag";
}

export function DeleteRefButton({ slug, name, kind }: DeleteRefButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir ${kind} "${name}"?`)) return;
    setLoading(true);
    try {
      const endpoint =
        kind === "branch"
          ? `/repositories/${slug}/branches/${encodeURIComponent(name)}`
          : `/repositories/${slug}/tags/${encodeURIComponent(name)}`;
      await apiFetch(endpoint, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} disabled={loading}>
      Excluir
    </Button>
  );
}
