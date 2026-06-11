"use client";

import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getExportUrl } from "@/lib/api";

interface CheckoutInstructionsProps {
  slug: string;
  checkoutUrl: string;
  svnUrl: string;
  branchRef: string;
}

export function CheckoutInstructions({
  slug,
  checkoutUrl,
  svnUrl,
  branchRef,
}: CheckoutInstructionsProps) {
  const httpsCommand = `svn checkout ${checkoutUrl}/trunk ${slug}`;
  const svnCommand = `svn checkout ${svnUrl}/trunk ${slug}`;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold">Clone (checkout)</h2>
      <p className="text-xs text-muted-foreground">
        Branch <strong>{branchRef}</strong> corresponde a <code>/trunk</code> no SVN.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">{httpsCommand}</code>
          <Button variant="outline" size="sm" onClick={() => copy(httpsCommand)}>
            <Copy className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-muted px-2 py-1 text-xs">{svnCommand}</code>
          <Button variant="outline" size="sm" onClick={() => copy(svnCommand)}>
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
