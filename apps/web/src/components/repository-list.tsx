import Link from "next/link";
import { Archive, GitBranch, GitCommitHorizontal } from "lucide-react";

import { HealthStatusBadge } from "@/components/health-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { HealthStatus } from "@svnhub/shared";

export interface RepositoryListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultBranch: string;
  isArchived: boolean;
  headRevision?: number;
  healthStatus?: HealthStatus;
  branchCount?: number;
  updatedAt?: string;
}

interface RepositoryListProps {
  repositories: RepositoryListItem[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
  return (
    <div className="grid gap-3">
      {repositories.map((repo) => (
        <Card key={repo.id} className="transition-colors hover:border-primary/40">
          <CardContent className="p-0">
            <Link
              href={`/repos/${repo.slug}`}
              className="flex items-start justify-between gap-4 px-4 py-4 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-primary">{repo.name}</p>
                  {repo.isArchived ? (
                    <Badge variant="muted">
                      <Archive className="size-3" aria-hidden />
                      Arquivado
                    </Badge>
                  ) : null}
                  {repo.healthStatus ? <HealthStatusBadge status={repo.healthStatus} /> : null}
                </div>
                {repo.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{repo.description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="size-3.5" aria-hidden />
                    {repo.branchCount != null
                      ? `${repo.branchCount} branch${repo.branchCount === 1 ? "" : "es"}`
                      : repo.defaultBranch}
                  </span>
                  {repo.headRevision != null ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <GitCommitHorizontal className="size-3.5" aria-hidden />
                      r{repo.headRevision}
                    </span>
                  ) : null}
                  {repo.updatedAt ? (
                    <span>
                      Atualizado {new Date(repo.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
