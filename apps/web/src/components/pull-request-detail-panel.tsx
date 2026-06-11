"use client";

import type {
  MergePreviewResponse,
  PullRequestDetail,
  PullRequestCommitsResponse,
} from "@svnhub/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DiffViewer } from "@/components/diff-viewer";
import { PipelineStatusBadge } from "@/components/pipeline-status-badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface PullRequestDetailPanelProps {
  slug: string;
  pullRequest: PullRequestDetail;
  preview: MergePreviewResponse | null;
  commits: PullRequestCommitsResponse;
}

type TabId = "conversation" | "files" | "commits";

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
    { id: "conversation", label: "Conversation" },
    { id: "files", label: "Files changed" },
    { id: "commits", label: "Commits" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              #{pullRequest.number} · {pullRequest.status}
            </p>
            <h2 className="text-xl font-semibold">{pullRequest.title}</h2>
            <p className="mt-1 text-sm">
              <span className="font-medium">{pullRequest.author.username}</span> quer mergear{" "}
              <code className="rounded bg-muted px-1">{pullRequest.sourceRef}</code> em{" "}
              <code className="rounded bg-muted px-1">{pullRequest.targetRef}</code>
            </p>
            {pullRequest.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm">{pullRequest.description}</p>
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
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">Status checks</h3>
            <ul className="space-y-2">
              {pullRequest.statusChecks.map((check) => (
                <li
                  key={check.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>{check.name}</span>
                  <div className="flex items-center gap-2">
                    {check.targetRevision ? (
                      <span className="text-xs text-muted-foreground">r{check.targetRevision}</span>
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
                      <a href={check.detailsUrl} className="text-xs text-primary hover:underline">
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
            Mergeado em r{pullRequest.mergeRevision}
            {pullRequest.mergedBy ? ` por ${pullRequest.mergedBy.username}` : ""}
          </p>
        ) : null}
      </div>

      <nav className="flex gap-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id
                ? "border-b-2 border-primary px-1 py-2 text-sm font-medium"
                : "px-1 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
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
            <article key={comment.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">{comment.author.username}</p>
              {comment.path ? (
                <p className="text-xs text-muted-foreground">
                  {comment.path}:{comment.line} ({comment.side})
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
            </article>
          ))}

          {pullRequest.reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">
                {review.author.username} · {review.decision}
              </p>
              {review.body ? <p className="mt-2 whitespace-pre-wrap text-sm">{review.body}</p> : null}
            </article>
          ))}

          {pullRequest.status === "OPEN" ? (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <form onSubmit={submitComment} className="space-y-2">
                <label className="text-sm font-medium">Comentário</label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            </div>
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
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Revisão</th>
                <th className="px-4 py-2">Autor</th>
                <th className="px-4 py-2">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {commits.commits.map((commit) => (
                <tr key={commit.revision} className="border-t border-border">
                  <td className="px-4 py-3">r{commit.revision}</td>
                  <td className="px-4 py-3">{commit.author}</td>
                  <td className="px-4 py-3">{commit.message.trim() || "(sem mensagem)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
