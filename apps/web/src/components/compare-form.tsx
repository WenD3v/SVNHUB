"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Base (ex.: main)</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Compare com</Label>
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="feature-x"
              required
            />
          </div>
          <Button type="submit">Comparar</Button>
        </form>
      </CardContent>
    </Card>
  );
}
