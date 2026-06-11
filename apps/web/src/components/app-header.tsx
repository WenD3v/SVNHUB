import Link from "next/link";
import { GitBranch } from "lucide-react";

import { AuthHeaderActions } from "@/components/auth-header-actions";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GitBranch className="size-5" />
          <span>SVNHUB</span>
        </Link>
        <AuthHeaderActions />
      </div>
    </header>
  );
}
