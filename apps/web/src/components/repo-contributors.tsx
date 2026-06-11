import Link from "next/link";

import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const maxCommits = Math.max(1, ...visible.map((contributor) => contributor.commits));

  if (visible.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Contributors</CardTitle>
        {showViewAll ? (
          <Link href={`/repos/${slug}/insights`} className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map((contributor) => (
          <div key={contributor.author} className="flex items-center gap-3">
            <UserAvatar username={contributor.author} className="size-8" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                {contributor.hasProfile ? (
                  <Link
                    href={`/users/${contributor.author}`}
                    className="truncate font-medium hover:underline"
                  >
                    {contributor.author}
                  </Link>
                ) : (
                  <span className="truncate font-medium">{contributor.author}</span>
                )}
                <span className="shrink-0 text-muted-foreground">
                  {contributor.commits} commit{contributor.commits === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(contributor.commits / maxCommits) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
