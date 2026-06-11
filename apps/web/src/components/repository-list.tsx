import Link from "next/link";
import { Archive, GitCommitHorizontal } from "lucide-react";

import type { RepositorySummary } from "@svnhub/shared";

interface RepositoryListProps {
  repositories: RepositorySummary[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
  if (repositories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Nenhum repositório ainda. Crie o primeiro usando o formulário ao lado.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {repositories.map((repo) => (
        <li key={repo.id}>
          <Link
            href={`/repos/${repo.slug}`}
            className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-accent/40"
          >
            <div>
              <p className="font-medium">{repo.name}</p>
              {repo.description ? (
                <p className="text-sm text-muted-foreground">{repo.description}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                branch padrão: {repo.defaultBranch}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {repo.isArchived ? <Archive className="size-4" /> : null}
              <GitCommitHorizontal className="size-4" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
