"use client";

import { Copy, GitBranch, GitCommitHorizontal, Tag } from "lucide-react";
import { useState } from "react";

import { CheckoutInstructions } from "@/components/checkout-instructions";
import { HealthStatusBadge } from "@/components/health-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    <aside>
      <Card className="py-0">
        <CardContent className="space-y-4 p-5">
          <h3 className="font-display text-sm font-semibold text-foreground">Sobre</h3>

          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Saúde</span>
            <HealthStatusBadge status={healthStatus} />
          </div>

          <Separator />

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <GitBranch className="size-4 shrink-0" aria-hidden />
                Branches
              </dt>
              <dd className="font-bold text-foreground">{branchCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Tag className="size-4 shrink-0" aria-hidden />
                Tags
              </dt>
              <dd className="font-bold text-foreground">{tagCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <GitCommitHorizontal className="size-4 shrink-0" aria-hidden />
                Revisões
              </dt>
              <dd className="font-bold text-foreground">
                {revisionCount.toLocaleString("pt-BR")}
              </dd>
            </div>
          </dl>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setCheckoutOpen((open) => !open)}
            aria-expanded={checkoutOpen}
          >
            <Copy className="size-4" />
            Instruções de checkout
          </Button>

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
