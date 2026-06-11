"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminAuditLogPanel } from "@/components/admin-audit-log-panel";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/lib/auth-context";

export default function AdminAuditLogPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user && !user.isAdmin) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user?.isAdmin) {
    return (
      <main className="min-h-screen bg-background">
        <AppHeader />
        <section className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Auditoria global</h1>
            <p className="text-sm text-muted-foreground">
              Eventos administrativos de toda a instância SVNHUB.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Início
          </Link>
        </div>

        <AdminAuditLogPanel />
      </section>
    </main>
  );
}
