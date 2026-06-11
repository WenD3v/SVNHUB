"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AuthHeaderActions() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
      >
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.isAdmin ? (
        <Link
          href="/admin/audit-log"
          className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Admin
        </Link>
      ) : null}
      <span className="hidden text-sm text-muted-foreground sm:inline">{user.username}</span>
      <Button variant="outline" size="sm" onClick={() => void logout()}>
        Sair
      </Button>
    </div>
  );
}
