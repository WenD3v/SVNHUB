"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { AccessTokenCreated, AccessTokenSummary } from "@svnhub/shared";
import { PAT_SCOPES } from "@svnhub/shared/access-token-scopes";

interface AccessTokensPanelProps {
  initialTokens: AccessTokenSummary[];
}

const SCOPE_LABELS: Record<string, string> = {
  "repo:read": "Leitura de repositórios",
  "repo:write": "Escrita em repositórios",
  admin: "Administração",
};

export function AccessTokensPanel({ initialTokens }: AccessTokensPanelProps) {
  const router = useRouter();
  const [tokens, setTokens] = useState(initialTokens);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["repo:read", "repo:write"]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((entry) => entry !== scope)
        : [...current, scope],
    );
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const created = await apiFetch<AccessTokenCreated>("/access-tokens", {
        method: "POST",
        body: JSON.stringify({ name, scopes }),
      });
      setNewToken(created.token);
      setName("");
      setTokens((prev) => [
        {
          id: created.id,
          name: created.name,
          scopes: created.scopes,
          lastUsedAt: created.lastUsedAt,
          expiresAt: created.expiresAt,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    await apiFetch(`/access-tokens/${id}`, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.id !== id));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <KeyRound className="size-4" aria-hidden />
          </span>
          <div>
            <CardTitle>Tokens de acesso pessoal</CardTitle>
            <CardDescription className="mt-1">
              Válidos para API e autenticação SVN futura. O valor é exibido apenas uma vez.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do token (ex.: CI local)"
          />
          <Button onClick={handleCreate} disabled={loading || !name || scopes.length === 0}>
            Criar token
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PAT_SCOPES.map((scope) => (
            <label
              key={scope}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                scopes.includes(scope)
                  ? "border-primary bg-brand-soft text-brand"
                  : "border-border-strong text-muted-foreground hover:bg-accent",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
              />
              {SCOPE_LABELS[scope] ?? scope}
            </label>
          ))}
        </div>
        {newToken ? (
          <div className="rounded-md border border-warning/50 bg-warning-soft p-3 text-sm">
            <p className="font-medium text-warning">Copie agora — não será exibido novamente:</p>
            <code className="mt-1 block break-all font-mono text-xs text-foreground">{newToken}</code>
          </div>
        ) : null}
        <ul className="divide-y divide-border text-sm">
          {tokens.map((token) => (
            <li key={token.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{token.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {token.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="font-mono text-[10px]">
                      {scope}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1 text-xs text-foreground-subtle">
                  Criado {new Date(token.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRevoke(token.id)}>
                Revogar
              </Button>
            </li>
          ))}
          {tokens.length === 0 ? (
            <li className="py-3 text-muted-foreground">Nenhum token criado.</li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}
