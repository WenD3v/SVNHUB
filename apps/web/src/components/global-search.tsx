"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FolderGit2, Search, UserRound } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { SearchResponse } from "@svnhub/shared";

export function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then((response) => {
          setResults(response);
          setOpen(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults({ repositories: [], users: [] });
            setOpen(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        if (results) {
          setOpen(true);
        }
      }
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results]);

  const hasResults = useMemo(() => {
    if (!results) {
      return false;
    }
    return results.repositories.length > 0 || results.users.length > 0;
  }, [results]);

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 md:block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Buscar repositórios e usuários…"
        className={cn(
          "h-9 border-border-strong bg-secondary/60 pl-9 pr-16 shadow-sm",
          "focus-visible:border-primary focus-visible:bg-card",
        )}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (results) {
            setOpen(true);
          }
        }}
        disabled={!user}
        aria-label="Buscar repositórios e usuários"
        aria-expanded={open}
        aria-controls="global-search-results"
        role="combobox"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground-subtle sm:inline-flex">
        Ctrl K
      </kbd>

      {open && query.trim().length >= 2 ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-[var(--radius)] border border-border bg-popover p-2 shadow-[var(--card-shadow)]"
        >
          {loading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Buscando…</p>
          ) : !hasResults ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          ) : (
            <div className="space-y-3">
              {results!.repositories.length > 0 ? (
                <section>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle">
                    Repositórios
                  </p>
                  <div className="space-y-0.5">
                    {results!.repositories.map((repo) => (
                      <Link
                        key={repo.id}
                        href={`/repos/${repo.slug}`}
                        role="option"
                        className="flex items-start gap-2.5 rounded-md px-2 py-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <FolderGit2 className="size-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {repo.name}
                          </span>
                          {repo.description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {repo.description}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {results!.users.length > 0 ? (
                <section>
                  <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-subtle">
                    Usuários
                  </p>
                  <div className="space-y-0.5">
                    {results!.users.map((searchUser) => (
                      <Link
                        key={searchUser.username}
                        href={`/users/${encodeURIComponent(searchUser.username)}`}
                        role="option"
                        className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <UserRound className="size-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {searchUser.displayName ?? searchUser.username}
                          </span>
                          <span className="block truncate text-xs text-foreground-subtle">
                            @{searchUser.username}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
