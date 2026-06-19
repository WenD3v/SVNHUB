"use client";

import type {
  AdminUserEntry,
  AdminUsersListResponse,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from "@svnhub/shared";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserAvatar } from "@/components/user-avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";

const PAGE_SIZE = 20;

type DialogMode = "create" | "edit" | "reset-password" | "deactivate" | null;

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("pt-BR");
}

export function AdminUsersPanel() {
  const [data, setData] = useState<AdminUsersListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateAdminUserRequest>({
    email: "",
    username: "",
    displayName: "",
    password: "",
    isAdmin: false,
  });
  const [editForm, setEditForm] = useState<UpdateAdminUserRequest>({});
  const [passwordForm, setPasswordForm] = useState("");

  const load = useCallback(async (pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageOffset),
        status,
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const response = await apiFetch<AdminUsersListResponse>(`/admin/users?${params}`);
      setData(response);
      setOffset(pageOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load(0);
  }, [load]);

  function openCreate() {
    setCreateForm({
      email: "",
      username: "",
      displayName: "",
      password: "",
      isAdmin: false,
    });
    setFormError(null);
    setDialogMode("create");
  }

  function openEdit(user: AdminUserEntry) {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    });
    setFormError(null);
    setDialogMode("edit");
  }

  function openResetPassword(user: AdminUserEntry) {
    setSelectedUser(user);
    setPasswordForm("");
    setFormError(null);
    setDialogMode("reset-password");
  }

  function openDeactivate(user: AdminUserEntry) {
    setSelectedUser(user);
    setFormError(null);
    setDialogMode("deactivate");
  }

  async function handleCreate() {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify(createForm),
      });
      setDialogMode(null);
      await load(offset);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      setDialogMode(null);
      await load(offset);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao atualizar usuário");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/admin/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: passwordForm }),
      });
      setDialogMode(null);
      await load(offset);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      setDialogMode(null);
      await load(offset);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao desativar usuário");
    } finally {
      setSubmitting(false);
    }
  }

  const total = data?.total ?? 0;
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="user-search">Buscar</Label>
          <Input
            id="user-search"
            placeholder="Username ou e-mail"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void load(0);
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="user-status">Status</Label>
          <select
            id="user-status"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        <Button variant="outline" onClick={() => void load(0)} disabled={loading}>
          Filtrar
        </Button>
        <Button onClick={openCreate}>Novo usuário</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--card-shadow)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último login</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.users ?? []).map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                      className="size-8"
                    />
                    <div>
                      <p className="font-medium">{user.displayName ?? user.username}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.isLocal ? "Local" : "LDAP"}</Badge>
                </TableCell>
                <TableCell>
                  {user.isAdmin ? <Badge variant="brand">Admin</Badge> : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "destructive"}>
                    {user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(user.lastLoginAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                      Editar
                    </Button>
                    {user.isLocal ? (
                      <Button variant="outline" size="sm" onClick={() => openResetPassword(user)}>
                        Senha
                      </Button>
                    ) : null}
                    {user.isActive ? (
                      <Button variant="outline" size="sm" onClick={() => openDeactivate(user)}>
                        Desativar
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && (data?.users.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total > 0
            ? `Mostrando ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} de ${total}`
            : "0 usuários"}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrev || loading}
            onClick={() => void load(Math.max(0, offset - PAGE_SIZE))}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNext || loading}
            onClick={() => void load(offset + PAGE_SIZE)}
          >
            Próxima
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={dialogMode === "create"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Cria uma conta local com acesso SVN sincronizado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="create-email">E-mail</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-display">Nome de exibição</Label>
              <Input
                id="create-display"
                value={createForm.displayName ?? ""}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-password">Senha inicial</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createForm.isAdmin ?? false}
                onChange={(e) => setCreateForm({ ...createForm, isAdmin: e.target.checked })}
              />
              Administrador
            </label>
          </div>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={submitting}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogMode === "edit"} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>@{selectedUser?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email ?? ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-display">Nome de exibição</Label>
              <Input
                id="edit-display"
                value={editForm.displayName ?? ""}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.isAdmin ?? false}
                onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
              />
              Administrador
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.isActive ?? true}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              Conta ativa
            </label>
          </div>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleEdit()} disabled={submitting}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "reset-password"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>@{selectedUser?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="reset-password">Nova senha</Label>
            <Input
              id="reset-password"
              type="password"
              value={passwordForm}
              onChange={(e) => setPasswordForm(e.target.value)}
            />
          </div>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleResetPassword()} disabled={submitting}>
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "deactivate"}
        onOpenChange={(open) => !open && setDialogMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar usuário</DialogTitle>
            <DialogDescription>
              A conta de @{selectedUser?.username} será desativada, tokens revogados e o acesso SVN
              removido.
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void handleDeactivate()} disabled={submitting}>
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
