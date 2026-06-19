"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, File, Folder, GitBranch } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RefSummary, SvnLogEntry, SvnTreeEntry } from "@svnhub/shared";
import { cn } from "@/lib/utils";

interface FileBrowserProps {
  slug: string;
  repoName: string;
  branchRef: string;
  path: string;
  revision: number;
  entries: SvnTreeEntry[];
  branches?: RefSummary[];
  latestCommit?: SvnLogEntry | null;
}

function formatRelativeDate(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "agora";
  }
  if (minutes < 60) {
    return `há ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `há ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `há ${days} d`;
  }

  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export function FileBrowser({
  slug,
  repoName,
  branchRef,
  path,
  revision,
  entries,
  branches = [],
  latestCommit,
}: FileBrowserProps) {
  const router = useRouter();

  const sorted = [...entries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  function navigateToRef(nextRef: string) {
    const basePath = path ? `/repos/${slug}/tree/${path}` : `/repos/${slug}`;
    router.push(`${basePath}?ref=${encodeURIComponent(nextRef)}`);
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary px-4 py-2.5 sm:px-5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Selecionar branch"
          >
            <GitBranch className="size-3.5 shrink-0" aria-hidden />
            {branchRef}
            <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[10rem]">
            {branches.length > 0
              ? branches.map((branch) => (
                  <DropdownMenuItem
                    key={branch.name}
                    onSelect={() => navigateToRef(branch.name)}
                    className={cn(branch.name === branchRef && "font-semibold text-brand")}
                  >
                    {branch.name}
                  </DropdownMenuItem>
                ))
              : (
                  <DropdownMenuItem disabled>{branchRef}</DropdownMenuItem>
                )}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="font-mono text-xs text-muted-foreground">
          {repoName}
          {path ? ` / ${path}` : ""}
          {" / "}
          <span className="text-brand">@ r{revision}</span>
        </span>

        <span className="ml-auto text-xs text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "item" : "itens"}
        </span>
      </div>

      {latestCommit ? (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-brand-soft px-4 py-2.5 sm:px-5">
          <UserAvatar username={latestCommit.author} className="size-6" brandFallback />
          <span className="min-w-0 text-xs text-foreground">
            <strong className="font-semibold">{latestCommit.author}</strong>
            {" "}
            <span className="text-muted-foreground">{latestCommit.message.split("\n")[0]}</span>
          </span>
          <Link
            href={`/repos/${slug}/commit/${latestCommit.revision}`}
            className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground hover:text-brand hover:underline"
          >
            r{latestCommit.revision} · {formatRelativeDate(latestCommit.date)}
          </Link>
        </div>
      ) : null}

      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Diretório vazio.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((entry) => {
              const nextPath = path ? `${path}/${entry.name}` : entry.name;
              const href =
                entry.kind === "dir"
                  ? `/repos/${slug}/tree/${nextPath}?ref=${branchRef}&revision=${revision}`
                  : `/repos/${slug}/blob/${nextPath}?ref=${branchRef}&revision=${revision}`;

              return (
                <li key={entry.path}>
                  <Link
                    href={href}
                    className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50 sm:px-5"
                  >
                    {entry.kind === "dir" ? (
                      <Folder className="size-4 shrink-0 text-brand" aria-hidden />
                    ) : (
                      <File className="size-4 shrink-0 text-foreground-subtle" aria-hidden />
                    )}
                    <span className="shrink-0 font-mono text-sm font-medium text-foreground group-hover:text-brand group-hover:underline sm:w-40">
                      {entry.name}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm">
                      {entry.kind === "file" && entry.size != null
                        ? `${entry.size.toLocaleString("pt-BR")} B`
                        : ""}
                    </span>
                    <span className="shrink-0 text-[11px] text-foreground-subtle sm:text-xs" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
