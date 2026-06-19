"use client";

import type { WebhookEventType, WebhookSummary } from "@svnhub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Webhook className="size-4" aria-hidden />
          </span>
          <div>
            <CardTitle>Webhooks de saída</CardTitle>
            <CardDescription className="mt-1">
              Notificações HMAC para revisão indexada, pipeline concluído e PR merged.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <form onSubmit={createWebhook} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Secret</Label>
            <Input
              id="webhook-secret"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label>Eventos</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((event) => (
                <label
                  key={event}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    events.includes(event)
                      ? "border-primary bg-brand-soft text-brand"
                      : "border-border-strong text-muted-foreground hover:bg-accent",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
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

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ul className="divide-y divide-border text-sm">
          {webhooks.map((webhook) => (
            <li key={webhook.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{webhook.url}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={webhook.isActive ? "success" : "muted"}>
                    {webhook.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <span className="text-xs text-foreground-subtle">
                    {webhook.events.join(", ")}
                  </span>
                </div>
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
      </CardContent>
    </Card>
  );
}
