"use client";

import type { WebhookEventType, WebhookSummary } from "@svnhub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

const EVENT_OPTIONS: WebhookEventType[] = [
  "REVISION_INDEXED",
  "PIPELINE_COMPLETED",
  "PR_MERGED",
  "ISSUE_OPENED",
  "ISSUE_CLOSED",
  "ISSUE_COMMENTED",
];

interface WebhooksPanelProps {
  slug: string;
}

export function WebhooksPanel({ slug }: WebhooksPanelProps) {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>([]);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<WebhookEventType[]>([
    "PIPELINE_COMPLETED",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reloadWebhooks() {
    try {
      const data = await apiFetch<WebhookSummary[]>(`/repositories/${slug}/webhooks`);
      setWebhooks(data);
    } catch {
      setWebhooks([]);
    }
  }

  useEffect(() => {
    void reloadWebhooks();
  }, [slug]);

  function toggleEvent(event: WebhookEventType) {
    setEvents((current) =>
      current.includes(event)
        ? current.filter((entry) => entry !== event)
        : [...current, event],
    );
  }

  async function createWebhook(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/webhooks`, {
        method: "POST",
        body: JSON.stringify({ url, secret, events }),
      });
      setUrl("");
      setSecret("");
      await reloadWebhooks();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar webhook");
    } finally {
      setLoading(false);
    }
  }

  async function removeWebhook(webhookId: string) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/webhooks/${webhookId}`, {
        method: "DELETE",
      });
      await reloadWebhooks();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover webhook");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(webhook: WebhookSummary) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/webhooks/${webhook.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });
      await reloadWebhooks();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar webhook");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="font-medium">Webhooks de saída</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Notificações HMAC para revisão indexada, pipeline concluído e PR merged.
        </p>
      </div>

      <form onSubmit={createWebhook} className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>URL</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Secret</span>
          <input
            className="w-full rounded-md border border-border bg-background px-3 py-2"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            required
          />
        </label>
        <div className="md:col-span-2">
          <span className="text-sm">Eventos</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {EVENT_OPTIONS.map((event) => (
              <label key={event} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={events.includes(event)}
                  onChange={() => toggleEvent(event)}
                />
                {event}
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" size="sm" disabled={loading}>
            Adicionar webhook
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="divide-y divide-border text-sm">
        {webhooks.map((webhook) => (
          <li key={webhook.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{webhook.url}</p>
              <p className="text-xs text-muted-foreground">
                {webhook.events.join(", ")} · {webhook.isActive ? "ativo" : "inativo"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => toggleActive(webhook)}
              >
                {webhook.isActive ? "Desativar" : "Ativar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => removeWebhook(webhook.id)}
              >
                Remover
              </Button>
            </div>
          </li>
        ))}
        {webhooks.length === 0 ? (
          <li className="py-3 text-muted-foreground">Nenhum webhook configurado.</li>
        ) : null}
      </ul>
    </div>
  );
}
