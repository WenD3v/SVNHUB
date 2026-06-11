"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { PullRequestDetail } from "@svnhub/shared";

interface CreatePullRequestFormProps {
  slug: string;
  sourceRef: string;
  targetRef: string;
}

export function CreatePullRequestForm({
  slug,
  sourceRef,
  targetRef,
}: CreatePullRequestFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(`Merge ${sourceRef} into ${targetRef}`);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const pullRequest = await apiFetch<PullRequestDetail>(
        `/repositories/${slug}/pull-requests`,
        {
          method: "POST",
          body: JSON.stringify({
            sourceRef,
            targetRef,
            title,
            description: description || undefined,
          }),
        },
      );
      router.push(`/repos/${slug}/pulls/${pullRequest.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar PR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium">Abrir Pull Request</h3>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Título</label>
        <input
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Descrição</label>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        Criar Pull Request
      </Button>
    </form>
  );
}
