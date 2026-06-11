"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
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
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={() => void markAllRead()}
            >
              Marcar todas como lidas
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(data?.items.length ?? 0) === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            {loading ? "Carregando..." : "Nenhuma notificação."}
          </p>
        ) : (
          data?.items.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link
                href={notificationHref(notification)}
                className={notification.readAt ? "opacity-70" : "font-medium"}
                onClick={() => void markRead(notification)}
              >
                <div className="space-y-1">
                  <p className="text-sm leading-snug">{formatNotificationLabel(notification)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
