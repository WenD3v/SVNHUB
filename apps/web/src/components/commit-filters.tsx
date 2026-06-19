"use client";

import { GitBranch, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CommitFiltersProps {
  slug: string;
}

export function CommitFilters({ slug }: CommitFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [author, setAuthor] = useState(searchParams.get("author") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [ref, setRef] = useState(searchParams.get("ref") ?? "main");

  function applyFilters() {
    const params = new URLSearchParams();
    params.set("ref", ref || "main");
    if (author) params.set("author", author);
    if (search) params.set("search", search);
    router.push(`/repos/${slug}/commits?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[200px] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-foreground-subtle"
          aria-hidden
        />
        <Input
          id="search-filter"
          className="h-9 pl-9"
          placeholder="Buscar na mensagem do commit…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyFilters();
            }
          }}
        />
      </div>
      <Input
        id="author-filter"
        className="h-9 w-40"
        placeholder="Autor"
        value={author}
        onChange={(event) => setAuthor(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            applyFilters();
          }
        }}
      />
      <div className="relative">
        <GitBranch
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="ref-filter"
          className="h-9 w-36 pl-9 font-mono text-sm font-semibold"
          value={ref}
          onChange={(event) => setRef(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyFilters();
            }
          }}
          aria-label="Branch"
        />
      </div>
      <Button size="sm" className="h-9" onClick={applyFilters}>
        Filtrar
      </Button>
    </div>
  );
}
