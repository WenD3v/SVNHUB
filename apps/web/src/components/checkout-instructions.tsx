"use client";

import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getExportUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CheckoutInstructionsProps {
  slug: string;
  checkoutUrl: string;
  svnUrl: string;
  branchRef: string;
  compact?: boolean;
}

export function CheckoutInstructions({
  slug,
  checkoutUrl,
  svnUrl,
  branchRef,
  compact = false,
}: CheckoutInstructionsProps) {
  const httpsCommand = `svn checkout ${checkoutUrl}/trunk ${slug}`;
  const svnCommand = `svn checkout ${svnUrl}/trunk ${slug}`;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className={cn("space-y-3", !compact && "rounded-lg border border-border p-4")}>
      {!compact ? <h2 className="text-sm font-semibold">Clone (checkout)</h2> : null}
      <p className="text-xs text-muted-foreground">
        Branch <strong>{branchRef}</strong> corresponde a <code className="rounded bg-muted px-1">/trunk</code> no SVN.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
            {httpsCommand}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(httpsCommand)}
            aria-label="Copiar comando HTTPS"
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
            {svnCommand}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(svnCommand)}
            aria-label="Copiar comando SVN"
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <a href={getExportUrl(slug, { ref: branchRef })}>
        <Button variant="secondary" size="sm">
          <Download className="size-4" />
          Download ZIP
        </Button>
      </a>
    </section>
  );
}
