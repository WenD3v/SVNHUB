"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    const ref = searchParams.get("ref");
    if (ref) params.set("ref", ref);
    if (author) params.set("author", author);
    if (search) params.set("search", search);
    router.push(`/repos/${slug}/commits?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="author-filter">Autor</Label>
          <Input
            id="author-filter"
            className="w-48"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="search-filter">Mensagem</Label>
          <Input
            id="search-filter"
            className="w-64"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button size="sm" onClick={applyFilters}>
          Filtrar
        </Button>
      </CardContent>
    </Card>
  );
}
