"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <form onSubmit={handleSubmit} className="flex w-full flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Nome da {label}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "branch" ? "feature-x" : "v1.0.0"}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Origem</Label>
            <Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando…" : `Criar ${label}`}
          </Button>
        </form>
        {error ? (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
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
