import Link from "next/link";
import { GitBranch } from "lucide-react";

import { AuthHeaderActions } from "@/components/auth-header-actions";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-foreground hover:text-primary"
        >
          <GitBranch className="size-5" aria-hidden />
          <span>SVNHUB</span>
        </Link>

        <GlobalSearch />

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <NotificationsBell />
          <AuthHeaderActions />
        </div>
      </div>
    </header>
  );
}
