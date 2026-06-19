"use client";

import { Copy, Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    <section className={cn("space-y-3", !compact && "rounded-lg border border-border bg-card p-4")}>
      {!compact ? <h2 className="font-display text-sm font-semibold">Clone (checkout)</h2> : null}
      <p className="text-xs text-muted-foreground">
        Branch <strong>{branchRef}</strong> corresponde a{" "}
        <code className="rounded bg-secondary px-1 font-mono text-[11px]">/trunk</code> no SVN.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs">
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
          <code className="flex-1 overflow-x-auto rounded-md border border-border bg-secondary px-2 py-1.5 font-mono text-xs">
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

interface CheckoutDialogButtonProps {
  slug: string;
  checkoutUrl: string;
  svnUrl: string;
  branchRef: string;
  className?: string;
}

export function CheckoutDialogButton({
  slug,
  checkoutUrl,
  svnUrl,
  branchRef,
  className,
}: CheckoutDialogButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>
          <Download className="size-4" />
          Checkout
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Instruções de checkout</DialogTitle>
        </DialogHeader>
        <CheckoutInstructions
          slug={slug}
          checkoutUrl={checkoutUrl}
          svnUrl={svnUrl}
          branchRef={branchRef}
        />
      </DialogContent>
    </Dialog>
  );
}
