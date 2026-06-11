"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { GroupRole, RepoRole, RepoTeamSummary, TeamDetail, TeamSummary } from "@svnhub/shared";

interface TeamsListPanelProps {
  initialTeams?: TeamSummary[];
}

export function TeamsListPanel({ initialTeams }: TeamsListPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamSummary[]>(initialTeams ?? []);
  const [loading, setLoading] = useState(!initialTeams);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TeamSummary[]>("/teams");
      setTeams(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTeams) {
      void load();
    }
  }, [initialTeams, load]);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const team = await apiFetch<TeamSummary>("/teams", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      });
      setDialogOpen(false);
      setName("");
      setDescription("");
      router.push(`/teams/${team.slug}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro ao criar team");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {user?.isAdmin ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Novo team
          </Button>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Membros</TableHead>
            <TableHead>Descrição</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell>
                <Link href={`/teams/${team.slug}`} className="font-medium hover:underline">
                  {team.name}
                </Link>
              </TableCell>
              <TableCell>
                <code className="text-xs">{team.slug}</code>
              </TableCell>
              <TableCell>{team.memberCount}</TableCell>
              <TableCell className="text-muted-foreground">
                {team.description ?? "—"}
              </TableCell>
            </TableRow>
          ))}
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Nenhum team cadastrado.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo team</DialogTitle>
            <DialogDescription>Crie um team para agrupar membros e permissões.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="team-name">Nome</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="team-description">Descrição</Label>
              <Input
                id="team-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!name.trim() || submitting}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TeamDetailPanelProps {
  slug: string;
  initialTeam: TeamDetail;
  users: Array<{ id: string; username: string; email: string }>;
}

export function TeamDetailPanel({ slug, initialTeam, users }: TeamDetailPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [memberRole, setMemberRole] = useState<GroupRole>("MEMBER");

  const canManageMembers =
    user?.isAdmin ||
    team.members.some((member) => member.userId === user?.id && member.role === "ADMIN");

  async function refreshTeam() {
    const data = await apiFetch<TeamDetail>(`/teams/${slug}`);
    setTeam(data);
    router.refresh();
  }

  async function handleAddMember() {
    setError(null);
    try {
      await apiFetch(`/teams/${slug}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role: memberRole }),
      });
      await refreshTeam();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Erro ao adicionar membro");
    }
  }

  async function handleRemoveMember(memberId: string) {
    setError(null);
    try {
      await apiFetch(`/teams/${slug}/members/${memberId}`, { method: "DELETE" });
      await refreshTeam();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Erro ao remover membro");
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-sm text-muted-foreground">
          <code>{team.slug}</code>
          {team.description ? ` · ${team.description}` : ""}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Membros</h2>
        {canManageMembers ? (
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              {users.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.username} ({entry.email})
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value as GroupRole)}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button size="sm" onClick={() => void handleAddMember()} disabled={!userId}>
              Adicionar membro
            </Button>
          </div>
        ) : null}
        <ul className="divide-y divide-border text-sm">
          {team.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between py-2">
              <span>
                {member.displayName ?? member.username}{" "}
                <span className="text-muted-foreground">@{member.username}</span>
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{member.role}</Badge>
                {canManageMembers ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRemoveMember(member.id)}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {team.members.length === 0 ? (
            <li className="py-2 text-muted-foreground">Nenhum membro.</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Repositórios vinculados</h2>
        <ul className="divide-y divide-border text-sm">
          {team.repositories.map((repo) => (
            <li key={repo.id} className="flex items-center justify-between py-2">
              <Link href={`/repos/${repo.slug}`} className="font-medium hover:underline">
                {repo.name}
              </Link>
              <Badge variant="outline">{repo.role}</Badge>
            </li>
          ))}
          {team.repositories.length === 0 ? (
            <li className="py-2 text-muted-foreground">Nenhum repositório vinculado.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

interface RepoTeamManagerProps {
  slug: string;
  teams: RepoTeamSummary[];
  allTeams: TeamSummary[];
}

export function RepoTeamManager({ slug, teams, allTeams }: RepoTeamManagerProps) {
  const router = useRouter();
  const [teamSlug, setTeamSlug] = useState(allTeams[0]?.slug ?? "");
  const [role, setRole] = useState<RepoRole>("DEVELOPER");

  async function handleLink() {
    await apiFetch(`/repositories/${slug}/teams`, {
      method: "POST",
      body: JSON.stringify({ teamSlug, role }),
    });
    router.refresh();
  }

  async function handleUpdate(linkedTeamSlug: string, nextRole: RepoRole) {
    await apiFetch(`/repositories/${slug}/teams/${linkedTeamSlug}`, {
      method: "PATCH",
      body: JSON.stringify({ role: nextRole }),
    });
    router.refresh();
  }

  async function handleUnlink(linkedTeamSlug: string) {
    await apiFetch(`/repositories/${slug}/teams/${linkedTeamSlug}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={teamSlug}
          onChange={(event) => setTeamSlug(event.target.value)}
        >
          {allTeams.map((team) => (
            <option key={team.id} value={team.slug}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value as RepoRole)}
        >
          <option value="OWNER">Owner</option>
          <option value="MAINTAINER">Maintainer</option>
          <option value="DEVELOPER">Developer</option>
          <option value="READER">Reader</option>
        </select>
        <Button size="sm" onClick={() => void handleLink()} disabled={!teamSlug}>
          Vincular team
        </Button>
      </div>
      <ul className="divide-y divide-border text-sm">
        {teams.map((team) => (
          <li key={team.id} className="flex items-center justify-between py-2">
            <span>
              <Link href={`/teams/${team.teamSlug}`} className="font-medium hover:underline">
                {team.teamName}
              </Link>{" "}
              <span className="text-muted-foreground">({team.teamSlug})</span>
            </span>
            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={team.role}
                onChange={(event) =>
                  void handleUpdate(team.teamSlug, event.target.value as RepoRole)
                }
              >
                <option value="OWNER">Owner</option>
                <option value="MAINTAINER">Maintainer</option>
                <option value="DEVELOPER">Developer</option>
                <option value="READER">Reader</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => void handleUnlink(team.teamSlug)}>
                Remover
              </Button>
            </div>
          </li>
        ))}
        {teams.length === 0 ? (
          <li className="py-2 text-muted-foreground">Nenhum team vinculado.</li>
        ) : null}
      </ul>
    </div>
  );
}
