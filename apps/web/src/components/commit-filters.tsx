"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CommitFiltersProps {
  slug: string;
}

export function CommitFilters({ slug }: CommitFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [author, setAuthor] = useState(searchParams.get("author") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  function applyFilters() {
    const params = new URLSearchParams();
    if (author) params.set("author", author);
    if (search) params.set("search", search);
    router.push(`/repos/${slug}/commits?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="author-filter">
          Autor
        </label>
        <input
          id="author-filter"
          className="block rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor="search-filter">
          Mensagem
        </label>
        <input
          id="search-filter"
          className="block rounded-md border border-input bg-background px-2 py-1 text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <Button size="sm" onClick={applyFilters}>
        Filtrar
      </Button>
    </div>
  );
}
