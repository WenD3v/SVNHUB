import Link from "next/link";
import { GitBranch, Search } from "lucide-react";

import { AuthHeaderActions } from "@/components/auth-header-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";

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

        <div className="relative hidden max-w-md flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Buscar repositórios…"
            className="h-9 pl-9"
            disabled
            aria-label="Buscar repositórios (em breve)"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AuthHeaderActions />
        </div>
      </div>
    </header>
  );
}
