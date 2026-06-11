import { AppHeader } from "@/components/app-header";
import { BackupsPanel } from "@/components/backups-panel";
import { AccessTokensPanel } from "@/components/access-tokens-panel";
import { MemberManager, PathPermissionManager } from "@/components/permissions-manager";
import { PolicyForm } from "@/components/repo-settings";
import { RepoNav } from "@/components/repo-nav";
import { WebhooksPanel } from "@/components/webhooks-panel";
import { apiFetch } from "@/lib/api";
import type {
  AuditLogResponse,
  PathPermissionSummary,
  RepoMemberSummary,
  RepoPolicySettings,
  RepositoryDetail,
} from "@svnhub/shared";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;

  const [repo, policy, members, permissions, auditLog, tokens, users, groups] =
    await Promise.all([
    apiFetch<RepositoryDetail>(`/repositories/${slug}`),
    apiFetch<RepoPolicySettings>(`/repositories/${slug}/settings/policies`),
    apiFetch<RepoMemberSummary[]>(`/repositories/${slug}/members`),
    apiFetch<PathPermissionSummary[]>(`/repositories/${slug}/permissions`),
    apiFetch<AuditLogResponse>(`/repositories/${slug}/audit-log?limit=20`),
    apiFetch<Array<{ id: string; name: string; scopes: string[]; lastUsedAt: string | null; expiresAt: string | null; createdAt: string }>>(
      "/access-tokens",
    ).catch(() => []),
    apiFetch<Array<{ id: string; username: string; email: string }>>("/users"),
    apiFetch<Array<{ id: string; name: string; description: string | null; memberCount: number }>>(
      "/groups",
    ),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">{repo.name}</h1>
          <p className="text-sm text-muted-foreground">Configurações do repositório</p>
        </div>

        <RepoNav slug={slug} active="settings" />

        <PolicyForm slug={slug} initial={policy} />

        <BackupsPanel slug={slug} health={repo.health} />

        <WebhooksPanel slug={slug} />

        <AccessTokensPanel initialTokens={tokens} />

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium">Membros</h3>
          <div className="mt-3">
            <MemberManager slug={slug} members={members} users={users} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium">Permissões por path</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Compiladas para o arquivo authz do SVN a cada alteração.
          </p>
          <div className="mt-3">
            <PathPermissionManager
              slug={slug}
              permissions={permissions}
              groups={groups}
              users={users}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h3 className="font-medium">Auditoria</h3>
          <ul className="mt-3 divide-y divide-border text-sm">
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
        </div>
      </section>
    </main>
  );
}
