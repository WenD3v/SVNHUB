import Link from "next/link";
import { notFound } from "next/navigation";

import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { PageShell } from "@/components/page-shell";
import { UserActivityFeed } from "@/components/user-activity-feed";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type {
  PublicUserProfile,
  UserActivityResponse,
  UserHeatmapResponse,
} from "@svnhub/shared";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;

  let profile: PublicUserProfile;
  try {
    profile = await apiFetch<PublicUserProfile>(`/users/${encodeURIComponent(username)}`);
  } catch {
    notFound();
  }

  const [heatmap, activity] = await Promise.all([
    apiFetch<UserHeatmapResponse>(`/users/${encodeURIComponent(username)}/stats/heatmap`).catch(
      () => ({ days: [], total: 0 }),
    ),
    apiFetch<UserActivityResponse>(`/users/${encodeURIComponent(username)}/stats/activity`).catch(
      () => ({ items: [], activeRepositories: [] }),
    ),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <UserAvatar
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            className="size-24 text-2xl"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h1 className="text-2xl font-bold">{profile.displayName ?? profile.username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            {profile.bio ? <p className="max-w-2xl text-sm">{profile.bio}</p> : null}
            <p className="text-sm text-muted-foreground">
              Entrou em {new Date(profile.createdAt).toLocaleDateString("pt-BR")}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <strong>{profile.stats.repositoryCount}</strong> repositórios
              </span>
              <span>
                <strong>{profile.stats.commitCount}</strong> commits
              </span>
              <span>
                <strong>{profile.stats.openPullRequestCount}</strong> PRs abertos
              </span>
              <span>
                <strong>{profile.stats.mergedPullRequestCount}</strong> PRs mergeados
              </span>
            </div>
          </div>
        </div>

        <ContributionHeatmap data={heatmap} />
        <UserActivityFeed data={activity} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Repositórios</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.repositories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum repositório visível.</p>
            ) : (
              <div className="divide-y divide-border">
                {profile.repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/repos/${repo.slug}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {repo.name}
                      </Link>
                      {repo.description ? (
                        <p className="truncate text-sm text-muted-foreground">{repo.description}</p>
                      ) : null}
                    </div>
                    {repo.isArchived ? (
                      <span className="text-xs text-muted-foreground">Arquivado</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
