import { AccessTokensPanel } from "@/components/access-tokens-panel";
import { BackupsPanel } from "@/components/backups-panel";
import { PageShell } from "@/components/page-shell";
import { MemberManager, PathPermissionManager } from "@/components/permissions-manager";
import { RepoTeamManager } from "@/components/teams-panel";
import { PolicyForm } from "@/components/repo-settings";
import { RepoBreadcrumbs } from "@/components/repo-breadcrumbs";
import { RepoNav } from "@/components/repo-nav";
import { WebhooksPanel } from "@/components/webhooks-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type {
  AuditLogResponse,
  PathPermissionSummary,
  RepoMemberSummary,
  RepoPolicySettings,
  RepoTeamSummary,
  RepositoryDetail,
  TeamSummary,
} from "@svnhub/shared";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;

  const [repo, policy, members, repoTeams, permissions, auditLog, tokens, users, teams] =
    await Promise.all([
      apiFetch<RepositoryDetail>(`/repositories/${slug}`),
      apiFetch<RepoPolicySettings>(`/repositories/${slug}/settings/policies`),
      apiFetch<RepoMemberSummary[]>(`/repositories/${slug}/members`),
      apiFetch<RepoTeamSummary[]>(`/repositories/${slug}/teams`),
      apiFetch<PathPermissionSummary[]>(`/repositories/${slug}/permissions`),
      apiFetch<AuditLogResponse>(`/repositories/${slug}/audit-log?limit=20`),
      apiFetch<
        Array<{
          id: string;
          name: string;
          scopes: string[];
          lastUsedAt: string | null;
          expiresAt: string | null;
          createdAt: string;
        }>
      >("/access-tokens").catch(() => []),
      apiFetch<Array<{ id: string; username: string; email: string }>>("/users"),
      apiFetch<TeamSummary[]>("/teams"),
    ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          <RepoBreadcrumbs slug={slug} repoName={repo.name} />
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configurações do repositório</p>
        </div>

        <RepoNav slug={slug} active="settings" />

        <PolicyForm slug={slug} initial={policy} />

        <BackupsPanel slug={slug} health={repo.health} />

        <WebhooksPanel slug={slug} />

        <AccessTokensPanel initialTokens={tokens} />

        <Card>
          <CardHeader>
            <CardTitle>Membros e Teams</CardTitle>
            <CardDescription>
              Membros individuais e teams vinculados com role no repositório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Membros</h3>
              <MemberManager slug={slug} members={members} users={users} />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Teams vinculados</h3>
              <RepoTeamManager slug={slug} teams={repoTeams} allTeams={teams} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissões por path</CardTitle>
            <CardDescription>
              Compiladas para o arquivo authz do SVN a cada alteração.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PathPermissionManager
              slug={slug}
              permissions={permissions}
              groups={teams.map((team) => ({ id: team.id, name: team.name }))}
              users={users}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {auditLog.entries.map((entry) => (
                <li key={entry.id} className="py-2">
                  <span className="font-medium">{entry.action}</span>{" "}
                  <span className="text-muted-foreground">
                    {entry.resourceType}
                    {entry.resourceId ? ` / ${entry.resourceId}` : ""}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {entry.username ?? "sistema"} ·{" "}
                    {new Date(entry.createdAt).toLocaleString("pt-BR")}
                  </p>
                </li>
              ))}
              {auditLog.entries.length === 0 ? (
                <li className="py-2 text-muted-foreground">Nenhum evento registrado.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
