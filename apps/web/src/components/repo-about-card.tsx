"use client";

import { ChevronDown, GitBranch, GitCommitHorizontal, Tag } from "lucide-react";
import { useState } from "react";

import { CheckoutInstructions } from "@/components/checkout-instructions";
import { HealthStatusBadge } from "@/components/health-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface RepoAboutCardProps {
  slug: string;
  description: string | null;
  checkoutUrl: string;
  svnUrl: string;
  branchRef: string;
  healthStatus: Parameters<typeof HealthStatusBadge>[0]["status"];
  branchCount: number;
  tagCount: number;
  revisionCount: number;
}

export function RepoAboutCard({
  slug,
  description,
  checkoutUrl,
  svnUrl,
  branchRef,
  healthStatus,
  branchCount,
  tagCount,
  revisionCount,
}: RepoAboutCardProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <aside className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sem descrição.</p>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Saúde</span>
            <HealthStatusBadge status={healthStatus} />
          </div>

          <Separator />

          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <GitBranch className="size-4" aria-hidden />
                Branches
              </dt>
              <dd className="font-medium">{branchCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Tag className="size-4" aria-hidden />
                Tags
              </dt>
              <dd className="font-medium">{tagCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <GitCommitHorizontal className="size-4" aria-hidden />
                Revisões
              </dt>
              <dd className="font-medium">{revisionCount}</dd>
            </div>
          </dl>

          <Separator />

          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium hover:text-primary"
            onClick={() => setCheckoutOpen((open) => !open)}
            aria-expanded={checkoutOpen}
          >
            Checkout
            <ChevronDown
              className={cn("size-4 transition-transform", checkoutOpen && "rotate-180")}
              aria-hidden
            />
          </button>

          {checkoutOpen ? (
            <CheckoutInstructions
              slug={slug}
              checkoutUrl={checkoutUrl}
              svnUrl={svnUrl}
              branchRef={branchRef}
              compact
            />
          ) : null}
        </CardContent>
      </Card>
    </aside>
  );
}
