"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { PathAccess, PathPermissionSummary, PrincipalType, RepoMemberSummary, RepoRole } from "@svnhub/shared";

interface MemberManagerProps {
  slug: string;
  members: RepoMemberSummary[];
  users: Array<{ id: string; username: string; email: string }>;
}

export function MemberManager({ slug, members, users }: MemberManagerProps) {
  const router = useRouter();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [role, setRole] = useState<RepoRole>("DEVELOPER");

  async function handleAdd() {
    await apiFetch(`/repositories/${slug}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    });
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    await apiFetch(`/repositories/${slug}/members/${memberId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username} ({user.email})
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as RepoRole)}
        >
          <option value="OWNER">Owner</option>
          <option value="MAINTAINER">Maintainer</option>
          <option value="DEVELOPER">Developer</option>
          <option value="READER">Reader</option>
        </select>
        <Button size="sm" onClick={handleAdd} disabled={!userId}>
          Adicionar membro
        </Button>
      </div>
      <ul className="divide-y divide-border text-sm">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between py-2">
            <span>
              {member.displayName ?? member.username}{" "}
              <span className="text-muted-foreground">({member.email})</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{member.role}</span>
              <Button variant="outline" size="sm" onClick={() => handleRemove(member.id)}>
                Remover
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PathPermissionManagerProps {
  slug: string;
  permissions: PathPermissionSummary[];
  groups: Array<{ id: string; name: string }>;
  users: Array<{ id: string; username: string }>;
}

export function PathPermissionManager({
  slug,
  permissions,
  groups,
  users,
}: PathPermissionManagerProps) {
  const router = useRouter();
  const [path, setPath] = useState("/branches");
  const [principalType, setPrincipalType] = useState<PrincipalType>("USER");
  const [principalId, setPrincipalId] = useState(users[0]?.id ?? "");
  const [access, setAccess] = useState<PathAccess>("WRITE");

  async function handleUpsert() {
    await apiFetch(`/repositories/${slug}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ path, principalType, principalId, access }),
    });
    router.refresh();
  }

  async function handleDelete(permissionId: string) {
    await apiFetch(`/repositories/${slug}/permissions/${permissionId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  const principals =
    principalType === "GROUP"
      ? groups.map((g) => ({ id: g.id, label: g.name }))
      : users.map((u) => ({ id: u.id, label: u.username }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/branches/feature-x"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={principalType}
          onChange={(e) => {
            setPrincipalType(e.target.value as PrincipalType);
            setPrincipalId("");
          }}
        >
          <option value="USER">Usuário</option>
          <option value="GROUP">Team</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={principalId}
          onChange={(e) => setPrincipalId(e.target.value)}
        >
          {principals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={access}
          onChange={(e) => setAccess(e.target.value as PathAccess)}
        >
          <option value="READ">Read</option>
          <option value="WRITE">Write</option>
          <option value="NONE">None</option>
        </select>
        <Button size="sm" onClick={handleUpsert} disabled={!principalId}>
          Salvar permissão
        </Button>
      </div>
      <ul className="divide-y divide-border text-sm">
        {permissions.map((perm) => (
          <li key={perm.id} className="flex items-center justify-between py-2">
            <span>
              <code className="text-xs">{perm.path}</code> → {perm.principalName} (
              {perm.principalType}) = {perm.access}
            </span>
            <Button variant="outline" size="sm" onClick={() => handleDelete(perm.id)}>
              Excluir
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
