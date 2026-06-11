"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <Card>
      <CardHeader>
        <CardTitle>Abrir Pull Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" disabled={loading}>
            Criar Pull Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
