"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="font-medium">Tokens de acesso pessoal</h3>
      <p className="text-sm text-muted-foreground">
        Válidos para API e autenticação SVN futura. O valor é exibido apenas uma vez.
      </p>
      <div className="flex gap-2">
        <input
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do token (ex.: CI local)"
        />
        <Button onClick={handleCreate} disabled={loading || !name || scopes.length === 0}>
          Criar token
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {PAT_SCOPES.map((scope) => (
          <label key={scope} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scopes.includes(scope)}
              onChange={() => toggleScope(scope)}
            />
            <span>{SCOPE_LABELS[scope] ?? scope}</span>
          </label>
        ))}
      </div>
      {newToken ? (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Copie agora — não será exibido novamente:</p>
          <code className="mt-1 block break-all font-mono text-xs">{newToken}</code>
        </div>
      ) : null}
      <ul className="divide-y divide-border text-sm">
        {tokens.map((token) => (
          <li key={token.id} className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">{token.name}</p>
              <p className="text-xs text-muted-foreground">
                {token.scopes.join(", ") || "sem escopos"} · criado{" "}
                {new Date(token.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleRevoke(token.id)}>
              Revogar
            </Button>
          </li>
        ))}
        {tokens.length === 0 ? (
          <li className="py-2 text-muted-foreground">Nenhum token criado.</li>
        ) : null}
      </ul>
    </div>
  );
}
