"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CompareFormProps {
  slug: string;
  initialSource: string;
  initialTarget: string;
}

export function CompareForm({ slug, initialSource, initialTarget }: CompareFormProps) {
  const router = useRouter();
  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState(initialTarget);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ source, target });
    router.push(`/repos/${slug}/compare?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Base (ex.: main)</label>
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Compare com</label>
        <input
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="feature-x"
          required
        />
      </div>
      <Button type="submit">Comparar</Button>
    </form>
  );
}
