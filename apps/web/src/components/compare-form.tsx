"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
    <Card className="overflow-hidden py-0">
      <CardContent className="p-5">
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-center gap-3"
        >
          <Label htmlFor="compare-base" className="text-[12.5px] font-semibold text-muted-foreground">
            Base
          </Label>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-sm text-foreground">
            <Input
              id="compare-base"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-7 min-w-[120px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <ArrowRight className="size-4 text-foreground-subtle" aria-hidden />

          <Label
            htmlFor="compare-target"
            className="text-[12.5px] font-semibold text-muted-foreground"
          >
            Comparar
          </Label>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-sm text-foreground">
            <Input
              id="compare-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="feature-x"
              required
              className="h-7 min-w-[160px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <Button type="submit" className="ml-auto">
            Comparar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
