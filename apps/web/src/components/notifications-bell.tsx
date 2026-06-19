"use client";

import Link from "next/link";
import {
  AlertCircle,
  AtSign,
  Bell,
  GitPullRequest,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type {
  NotificationSummary,
  NotificationsResponse,
} from "@svnhub/shared";

const POLL_INTERVAL_MS = 60_000;

function formatNotificationLabel(notification: NotificationSummary): string {
  switch (notification.type) {
    case "PR_REVIEW_REQUESTED": {
      const payload = notification.payload;
      return `Review solicitado: ${payload.repositorySlug}#${payload.pullRequestNumber}`;
    }
    case "ISSUE_ASSIGNED": {
      const payload = notification.payload;
      return `Issue atribuída: ${payload.repositorySlug}#${payload.issueNumber}`;
    }
    case "PIPELINE_FAILED": {
      const payload = notification.payload;
      return `Pipeline falhou em ${payload.repositorySlug} (r${payload.revision})`;
    }
    case "MENTION": {
      const payload = notification.payload;
      return `@${payload.authorUsername} mencionou você em ${payload.repositorySlug}`;
    }
    default:
      return "Nova notificação";
  }
}

function notificationHref(notification: NotificationSummary): string {
  switch (notification.type) {
    case "PR_REVIEW_REQUESTED": {
      const payload = notification.payload;
      return `/repos/${payload.repositorySlug}/pulls/${payload.pullRequestNumber}`;
    }
    case "ISSUE_ASSIGNED": {
      const payload = notification.payload;
      return `/repos/${payload.repositorySlug}/issues/${payload.issueNumber}`;
    }
    case "PIPELINE_FAILED": {
      const payload = notification.payload;
      return `/repos/${payload.repositorySlug}/pipelines/${payload.pipelineId}`;
    }
    case "MENTION": {
      const payload = notification.payload;
      return payload.context === "pull_request"
        ? `/repos/${payload.repositorySlug}/pulls/${payload.contextNumber}`
        : `/repos/${payload.repositorySlug}/issues/${payload.contextNumber}`;
    }
    default:
      return "/";
  }
}

function NotificationIcon({ type }: { type: NotificationSummary["type"] }) {
  const className = "size-4 shrink-0";
  switch (type) {
    case "PR_REVIEW_REQUESTED":
      return <GitPullRequest className={cn(className, "text-brand")} aria-hidden />;
    case "ISSUE_ASSIGNED":
      return <AlertCircle className={cn(className, "text-warning")} aria-hidden />;
    case "PIPELINE_FAILED":
      return <Workflow className={cn(className, "text-destructive")} aria-hidden />;
    case "MENTION":
      return <AtSign className={cn(className, "text-brand")} aria-hidden />;
    default:
      return <Bell className={cn(className, "text-muted-foreground")} aria-hidden />;
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<NotificationsResponse>("/notifications?limit=10");
      setData(response);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [user, loadNotifications]);

  if (!user) {
    return null;
  }

  async function markRead(notification: NotificationSummary) {
    if (!notification.readAt) {
      await apiFetch(`/notifications/${notification.id}/read`, { method: "POST" });
      await loadNotifications();
    }
  }

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "POST" });
    await loadNotifications();
  }

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative size-8"
          aria-label="Notificações"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 size-2 rounded-full bg-brand ring-2 ring-[var(--header-bg)]"
              aria-hidden
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 rounded-[var(--radius)] border-border bg-popover p-0 shadow-[var(--card-shadow)]"
      >
        <DropdownMenuLabel className="flex items-center justify-between border-b border-border bg-secondary px-3 py-2.5">
          <span className="font-display text-sm font-semibold">Notificações</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void markAllRead()}
            >
              Marcar todas como lidas
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {(data?.items.length ?? 0) === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {loading ? "Carregando..." : "Nenhuma notificação."}
          </p>
        ) : (
          data?.items.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild className="p-0">
              <Link
                href={notificationHref(notification)}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-3 focus-visible:outline-none",
                  notification.readAt ? "opacity-70" : "bg-brand-soft/30",
                )}
                onClick={() => void markRead(notification)}
              >
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <NotificationIcon type={notification.type} />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p
                    className={cn(
                      "text-sm leading-snug text-foreground",
                      !notification.readAt && "font-medium",
                    )}
                  >
                    {formatNotificationLabel(notification)}
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    {new Date(notification.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                {!notification.readAt ? (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-brand"
                    aria-label="Não lida"
                  />
                ) : null}
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
