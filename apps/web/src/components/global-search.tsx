"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FolderGit2, Search, UserRound } from "lucide-react";

import { Input } from "@/components/ui/input";
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

  const hasResults = useMemo(() => {
    if (!results) {
      return false;
    }
    return results.repositories.length > 0 || results.users.length > 0;
  }, [results]);

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 md:block">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Buscar repositórios e usuários…"
        className="h-9 pl-9"
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

      {open && query.trim().length >= 2 ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-popover p-2 shadow-lg"
        >
          {loading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Buscando…</p>
          ) : !hasResults ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
          ) : (
            <div className="space-y-3">
              {results!.repositories.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Repositórios
                  </p>
                  <div className="space-y-1">
                    {results!.repositories.map((repo) => (
                      <Link
                        key={repo.id}
                        href={`/repos/${repo.slug}`}
                        role="option"
                        className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted"
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <FolderGit2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{repo.name}</span>
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
                  <p className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Usuários
                  </p>
                  <div className="space-y-1">
                    {results!.users.map((searchUser) => (
                      <Link
                        key={searchUser.username}
                        href={`/users/${encodeURIComponent(searchUser.username)}`}
                        role="option"
                        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted"
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {searchUser.displayName ?? searchUser.username}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
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
