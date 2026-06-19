"use client";

import type {
  IssueDetail,
  IssueLabelSummary,
  IssueTimelineEntry,
} from "@svnhub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarkdownContent } from "@/components/markdown-content";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface IssueDetailPanelProps {
  slug: string;
  issue: IssueDetail;
  labels: IssueLabelSummary[];
}

function TimelineEntry({
  slug,
  entry,
}: {
  slug: string;
  entry: IssueTimelineEntry;
}) {
  if (entry.type === "opened") {
    return (
      <Card className="overflow-hidden py-0">
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {entry.actor ? (
              <>
                <UserAvatar
                  username={entry.actor.username}
                  avatarUrl={entry.actor.avatarUrl}
                  className="size-7"
                />
                <Link href={`/users/${entry.actor.username}`} className="font-medium text-foreground hover:text-brand">
                  {entry.actor.username}
                </Link>
              </>
            ) : null}
            <span>abriu esta issue</span>
            <time dateTime={entry.createdAt} className="text-foreground-subtle">
              {new Date(entry.createdAt).toLocaleString("pt-BR")}
            </time>
          </div>
          {entry.body ? <MarkdownContent content={entry.body} slug={slug} /> : null}
        </CardContent>
      </Card>
    );
  }

  if (entry.type === "comment" || entry.type === "commit_reference") {
    return (
      <Card className="overflow-hidden py-0">
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {entry.actor ? (
              <>
                <UserAvatar
                  username={entry.actor.username}
                  avatarUrl={entry.actor.avatarUrl}
                  className="size-7"
                />
                <Link href={`/users/${entry.actor.username}`} className="font-medium text-foreground hover:text-brand">
                  {entry.actor.username}
                </Link>
              </>
            ) : null}
            <span>{entry.type === "commit_reference" ? "referenciou um commit" : "comentou"}</span>
            <time dateTime={entry.createdAt} className="text-foreground-subtle">
              {new Date(entry.createdAt).toLocaleString("pt-BR")}
            </time>
          </div>
          {entry.body ? <MarkdownContent content={entry.body} slug={slug} /> : null}
        </CardContent>
      </Card>
    );
  }

  if (entry.type === "closed" || entry.type === "closed_by_pr") {
    const prNumber = entry.metadata?.pullRequestNumber as number | undefined;
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Issue fechada
        {entry.type === "closed_by_pr" && prNumber ? (
          <>
            {" "}
            via{" "}
            <Link href={`/repos/${slug}/pulls/${prNumber}`} className="text-brand hover:underline">
              pull request #{prNumber}
            </Link>
          </>
        ) : null}
        {" · "}
        <time dateTime={entry.createdAt}>
          {new Date(entry.createdAt).toLocaleString("pt-BR")}
        </time>
      </div>
    );
  }

  return null;
}

export function IssueDetailPanel({ slug, issue, labels }: IssueDetailPanelProps) {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshDetail() {
    router.refresh();
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/issues/${issue.number}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody }),
      });
      setCommentBody("");
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao comentar");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: "OPEN" | "CLOSED") {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/issues/${issue.number}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status");
    } finally {
      setLoading(false);
    }
  }

  async function updateLabels(labelIds: string[]) {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/issues/${issue.number}`, {
        method: "PATCH",
        body: JSON.stringify({ labelIds }),
      });
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar labels");
    } finally {
      setLoading(false);
    }
  }

  function toggleLabel(labelId: string) {
    const current = issue.labels.map((label) => label.id);
    const next = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    void updateLabels(next);
  }

  const statusVariant = issue.status === "OPEN" ? "success" : "muted";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {issue.status === "OPEN" ? (
            <Button variant="outline" size="sm" disabled={loading} onClick={() => updateStatus("CLOSED")}>
              Fechar issue
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={loading} onClick={() => updateStatus("OPEN")}>
              Reabrir issue
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {issue.timeline.map((entry) => (
            <TimelineEntry key={entry.id} slug={slug} entry={entry} />
          ))}
        </div>

        <Card className="overflow-hidden py-0">
          <CardContent className="p-4">
            <form onSubmit={submitComment} className="space-y-3">
              <Label htmlFor="issue-comment">Novo comentário</Label>
              <textarea
                id="issue-comment"
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                className="min-h-28 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Escreva um comentário..."
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading || !commentBody.trim()}>
                Comentar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <Badge variant={statusVariant}>{issue.status === "OPEN" ? "Aberta" : "Fechada"}</Badge>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Autor</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex items-center gap-2">
              <UserAvatar
                username={issue.author.username}
                avatarUrl={issue.author.avatarUrl}
                className="size-7"
              />
              <Link href={`/users/${issue.author.username}`} className="text-sm hover:text-brand">
                {issue.author.username}
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Assignee</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {issue.assignee ? (
              <div className="flex items-center gap-2">
                <UserAvatar
                  username={issue.assignee.username}
                  avatarUrl={issue.assignee.avatarUrl}
                  className="size-7"
                />
                <Link href={`/users/${issue.assignee.username}`} className="text-sm hover:text-brand">
                  {issue.assignee.username}
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ninguém atribuído</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Labels</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => {
                const active = issue.labels.some((entry) => entry.id === label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    disabled={loading}
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50",
                      active ? "ring-2 ring-ring ring-offset-1" : "opacity-70",
                    )}
                    style={{
                      backgroundColor: `${label.color}22`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                    {active ? " ✓" : ""}
                  </button>
                );
              })}
              {labels.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma label cadastrada.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {issue.closedByPrNumber ? (
          <Card className="overflow-hidden py-0">
            <CardHeader className="px-4 py-3">
              <CardTitle>Pull request vinculado</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <Link
                href={`/repos/${slug}/pulls/${issue.closedByPrNumber}`}
                className="font-mono text-sm text-brand hover:underline"
              >
                #{issue.closedByPrNumber}
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
