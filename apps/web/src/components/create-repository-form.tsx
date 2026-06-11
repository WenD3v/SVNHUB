"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";
import type { RepositoryDetail } from "@svnhub/shared";
import { slugifyRepoName } from "@svnhub/shared/svn-path";

export function CreateRepositoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const repo = await apiFetch<RepositoryDetail>("/repositories", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      });
      router.push(`/repos/${repo.slug}`);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Erro ao criar repositório";

      if (message.includes("Repository already exists")) {
        const slug = slugifyRepoName(name);
        if (slug) {
          router.push(`/repos/${slug}`);
          router.refresh();
          return;
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="repo-name">Nome</Label>
        <Input
          id="repo-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="meu-projeto"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="repo-description">Descrição</Label>
        <textarea
          id="repo-description"
          className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Opcional"
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Criando..." : "Criar repositório"}
      </Button>
    </form>
  );
}
