"use client";

import type {
  MergePreviewResponse,
  PullRequestDetail,
  PullRequestCommitsResponse,
} from "@svnhub/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DiffViewer } from "@/components/diff-viewer";
import { PipelineStatusBadge } from "@/components/pipeline-status-badge";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface PullRequestDetailPanelProps {
  slug: string;
  pullRequest: PullRequestDetail;
  preview: MergePreviewResponse | null;
  commits: PullRequestCommitsResponse;
}

type TabId = "conversation" | "files" | "commits";

function getPullRequestStatusBadge(status: PullRequestDetail["status"]) {
  switch (status) {
    case "OPEN":
      return { variant: "success" as const, label: "Aberto" };
    case "MERGED":
      return {
        variant: "brand" as const,
        label: "Mergeado",
        className: "text-[var(--brand-2)]",
      };
    case "CLOSED":
      return { variant: "destructive" as const, label: "Fechado" };
  }
}

export function PullRequestDetailPanel({
  slug,
  pullRequest,
  preview,
  commits,
}: PullRequestDetailPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("conversation");
  const [commentBody, setCommentBody] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [deleteBranch, setDeleteBranch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusBadge = getPullRequestStatusBadge(pullRequest.status);

  async function refreshDetail() {
    router.refresh();
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/pull-requests/${pullRequest.number}/comments`, {
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

  async function submitReview(decision: "APPROVED" | "CHANGES_REQUESTED") {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/pull-requests/${pullRequest.number}/reviews`, {
        method: "POST",
        body: JSON.stringify({ decision, body: reviewBody || undefined }),
      });
      setReviewBody("");
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revisar");
    } finally {
      setLoading(false);
    }
  }

  async function mergePullRequest() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/pull-requests/${pullRequest.number}/merge`, {
        method: "POST",
        body: JSON.stringify({ deleteSourceBranch: deleteBranch }),
      });
      await refreshDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao mergear");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: "OPEN" | "CLOSED") {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/repositories/${slug}/pull-requests/${pullRequest.number}`, {
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

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "conversation", label: "Conversa" },
    { id: "commits", label: "Commits" },
    { id: "files", label: "Arquivos" },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden py-0">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={statusBadge.variant}
                  className={cn("font-semibold", statusBadge.className)}
                >
                  {statusBadge.label}
                </Badge>
                <span className="font-mono text-sm text-muted-foreground">
                  #{pullRequest.number}
                </span>
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {pullRequest.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <UserAvatar
                  username={pullRequest.author.username}
                  avatarUrl={pullRequest.author.avatarUrl}
                  className="size-7"
                />
                <span>
                  <Link
                    href={`/users/${pullRequest.author.username}`}
                    className="font-medium text-foreground hover:text-brand"
                  >
                    {pullRequest.author.username}
                  </Link>{" "}
                  quer mergear{" "}
                  <span className="inline-flex items-center gap-1 font-mono text-xs">
                    <span className="rounded bg-secondary px-1.5 py-px text-foreground">
                      {pullRequest.sourceRef}
                    </span>
                    <span aria-hidden>→</span>
                    <span className="rounded bg-secondary px-1.5 py-px text-foreground">
                      {pullRequest.targetRef}
                    </span>
                  </span>
                </span>
              </div>
              {pullRequest.description ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {pullRequest.description}
                </p>
              ) : null}
            </div>

            {pullRequest.status === "OPEN" ? (
              <div className="space-y-2 text-right">
                <div className="text-xs text-muted-foreground">
                  {pullRequest.mergeEligibility.canMerge
                    ? "Pronto para merge"
                    : pullRequest.mergeEligibility.reasons.join(" · ")}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => updateStatus("CLOSED")}
                  >
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    disabled={loading || !pullRequest.mergeEligibility.canMerge}
                    onClick={mergePullRequest}
                  >
                    Merge pull request
                  </Button>
                </div>
                <label className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={deleteBranch}
                    onChange={(e) => setDeleteBranch(e.target.checked)}
                  />
                  Deletar branch após merge
                </label>
              </div>
            ) : pullRequest.status === "CLOSED" ? (
              <Button variant="outline" size="sm" disabled={loading} onClick={() => updateStatus("OPEN")}>
                Reabrir
              </Button>
            ) : null}
          </div>

          {pullRequest.statusChecks.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground">Status checks</h3>
              <ul className="space-y-2">
                {pullRequest.statusChecks.map((check) => (
                  <li
                    key={check.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <span>{check.name}</span>
                    <div className="flex items-center gap-2">
                      {check.targetRevision ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          r{check.targetRevision}
                        </span>
                      ) : null}
                      <PipelineStatusBadge
                        status={
                          check.status === "PENDING"
                            ? "QUEUED"
                            : check.status === "SUCCESS"
                              ? "SUCCESS"
                              : "FAILURE"
                        }
                      />
                      {check.detailsUrl ? (
                        <a href={check.detailsUrl} className="text-xs text-brand hover:underline">
                          detalhes
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview?.hasConflicts ? (
            <p className="mt-3 text-sm text-destructive">
              Conflitos detectados: {preview.conflictPaths.join(", ") || "paths desconhecidos"}
            </p>
          ) : null}

          {pullRequest.status === "MERGED" && pullRequest.mergeRevision ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Mergeado em{" "}
              <span className="font-mono">r{pullRequest.mergeRevision}</span>
              {pullRequest.mergedBy ? ` por ${pullRequest.mergedBy.username}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <nav className="flex gap-1 border-b border-border" aria-label="Abas do pull request">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "px-3 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {activeTab === "conversation" ? (
        <div className="space-y-4">
          {pullRequest.comments.map((comment) => (
            <Card key={comment.id} className="overflow-hidden py-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    username={comment.author.username}
                    avatarUrl={comment.author.avatarUrl}
                    className="size-7"
                  />
                  <Link
                    href={`/users/${comment.author.username}`}
                    className="text-sm font-medium hover:text-brand"
                  >
                    {comment.author.username}
                  </Link>
                </div>
                {comment.path ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {comment.path}:{comment.line} ({comment.side})
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
              </CardContent>
            </Card>
          ))}

          {pullRequest.reviews.map((review) => (
            <Card key={review.id} className="overflow-hidden py-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    username={review.author.username}
                    avatarUrl={review.author.avatarUrl}
                    className="size-7"
                  />
                  <p className="text-sm font-medium">
                    <Link
                      href={`/users/${review.author.username}`}
                      className="hover:text-brand"
                    >
                      {review.author.username}
                    </Link>{" "}
                    · {review.decision}
                  </p>
                </div>
                {review.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm">{review.body}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {pullRequest.status === "OPEN" ? (
            <Card className="overflow-hidden py-0">
              <CardContent className="space-y-4 p-4">
                <form onSubmit={submitComment} className="space-y-2">
                  <label className="text-sm font-medium">Comentário</label>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    required
                  />
                  <Button type="submit" size="sm" disabled={loading}>
                    Comentar
                  </Button>
                </form>

                <div className="space-y-2 border-t border-border pt-4">
                  <label className="text-sm font-medium">Review</label>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="Comentário opcional da review"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading}
                      onClick={() => submitReview("APPROVED")}
                    >
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => submitReview("CHANGES_REQUESTED")}
                    >
                      Solicitar mudanças
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "files" ? (
        preview ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {preview.changedPaths.length} path(s) alterado(s) ·{" "}
              {preview.hasConflicts ? "com conflitos" : "sem conflitos"}
            </p>
            <DiffViewer files={preview.files} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Preview indisponível para este PR.</p>
        )
      ) : null}

      {activeTab === "commits" ? (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Revisão</th>
                  <th className="px-5 py-3">Autor</th>
                  <th className="px-5 py-3">Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commits.commits.map((commit) => (
                  <tr key={commit.revision} className="hover:bg-accent/30">
                    <td className="px-5 py-3 font-mono">r{commit.revision}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar username={commit.author} className="size-6" />
                        <Link href={`/users/${commit.author}`} className="hover:text-brand">
                          {commit.author}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {commit.message.trim() || "(sem mensagem)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
