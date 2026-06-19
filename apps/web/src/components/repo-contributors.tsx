import Link from "next/link";

import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { RepositoryContributor } from "@svnhub/shared";

interface RepoContributorsProps {
  slug: string;
  contributors: RepositoryContributor[];
  limit?: number;
  showViewAll?: boolean;
}

export function RepoContributors({
  slug,
  contributors,
  limit = 5,
  showViewAll = true,
}: RepoContributorsProps) {
  const visible = contributors.slice(0, limit);

  if (visible.length === 0) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="p-5">
        <div className="mb-3.5 flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground">Contribuidores</h3>
          <span className="text-xs text-muted-foreground">{contributors.length}</span>
          {showViewAll ? (
            <Link
              href={`/repos/${slug}/insights`}
              className="ml-auto text-xs text-brand hover:underline"
            >
              Ver todos
            </Link>
          ) : null}
        </div>

        <ul className="space-y-3">
          {visible.map((contributor) => (
            <li key={contributor.author} className="flex items-center gap-3">
              <UserAvatar username={contributor.author} className="size-8" />
              <div className="min-w-0 flex-1">
                {contributor.hasProfile ? (
                  <Link
                    href={`/users/${contributor.author}`}
                    className="block truncate text-sm font-semibold text-foreground hover:text-brand hover:underline"
                  >
                    {contributor.author}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {contributor.author}
                  </span>
                )}
                <span className="text-[11.5px] text-muted-foreground">@{contributor.author}</span>
              </div>
              <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">
                {contributor.commits}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
