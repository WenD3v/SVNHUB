"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminNav } from "@/components/admin-nav";
import { PageShell } from "@/components/page-shell";
import { TeamsListPanel } from "@/components/teams-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

export default function TeamsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <PageShell>
        <section className="mx-auto max-w-7xl space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Teams</h1>
            <p className="text-sm text-muted-foreground">
              Grupos de usuários com acesso compartilhado a repositórios.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Início</Link>
          </Button>
        </div>

        {user.isAdmin ? <AdminNav /> : null}
        <TeamsListPanel />
      </section>
    </PageShell>
  );
}
