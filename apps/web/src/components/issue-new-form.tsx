"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Card className="mx-auto max-w-3xl overflow-hidden py-0">
      <CardHeader className="px-5 py-4">
        <CardTitle>Nova issue</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issue-title">Título</Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Descreva o problema ou sugestão"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-body">Descrição</Label>
            <textarea
              id="issue-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-48 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </CardContent>
    </Card>
  );
}
