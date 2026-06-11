"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FolderGit2, Plus, Search } from "lucide-react";

import { CreateRepositoryForm } from "@/components/create-repository-form";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthUser, RepositorySummary } from "@svnhub/shared";

interface DashboardSidebarProps {
  user: AuthUser;
  repositories: RepositorySummary[];
  loading?: boolean;
}

export function DashboardSidebar({ user, repositories, loading }: DashboardSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredRepositories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return repositories;
    }
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(term) ||
        repo.slug.toLowerCase().includes(term) ||
        (repo.description?.toLowerCase().includes(term) ?? false),
    );
  }, [repositories, search]);

  return (
    <aside className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar
          username={user.username}
          avatarUrl={user.avatarUrl}
          className="size-16 text-lg"
        />
        <div className="min-w-0">
          <Link
            href={`/users/${encodeURIComponent(user.username)}`}
            className="block truncate font-semibold hover:text-primary"
          >
            {user.displayName ?? user.username}
          </Link>
          <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Repositórios</h2>
          <Link
            href="/repos"
            className="text-xs text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar repositórios…"
            className="h-8 pl-8 text-sm"
            aria-label="Filtrar repositórios"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : filteredRepositories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {repositories.length === 0
            ? "Nenhum repositório acessível."
            : "Nenhum repositório corresponde à busca."}
        </p>
      ) : (
        <nav className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {filteredRepositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/repos/${repo.slug}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <FolderGit2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{repo.name}</span>
            </Link>
          ))}
        </nav>
      )}

      {user.isAdmin ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="size-4" aria-hidden />
              Novo repositório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo repositório</DialogTitle>
            </DialogHeader>
            <CreateRepositoryForm />
          </DialogContent>
        </Dialog>
      ) : null}
    </aside>
  );
}
