"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { IssueDetail } from "@svnhub/shared";

interface IssueNewFormProps {
  slug: string;
}

export function IssueNewForm({ slug }: IssueNewFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const issue = await apiFetch<IssueDetail>(`/repositories/${slug}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title,
          body: body || undefined,
        }),
      });
      router.push(`/repos/${slug}/issues/${issue.number}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar issue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-4">
      <div className="space-y-2">
        <label htmlFor="issue-title" className="text-sm font-medium">
          Título
        </label>
        <input
          id="issue-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Descreva o problema ou sugestão"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="issue-body" className="text-sm font-medium">
          Descrição
        </label>
        <textarea
          id="issue-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Detalhes adicionais (markdown suportado)"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !title.trim()}>
          Criar issue
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
