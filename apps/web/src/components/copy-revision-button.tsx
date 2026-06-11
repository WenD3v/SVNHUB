"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CopyRevisionButtonProps {
  revision: number;
  className?: string;
}

export function CopyRevisionButton({ revision, className }: CopyRevisionButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await navigator.clipboard.writeText(String(revision));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={handleCopy}
      aria-label={copied ? "Revisão copiada" : `Copiar revisão r${revision}`}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
