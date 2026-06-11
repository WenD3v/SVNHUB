"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { UserProfile } from "@svnhub/shared";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void apiFetch<UserProfile>("/users/me")
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, [user]);

  if (loading || !user || profileLoading || !profile) {
    return (
      <PageShell>
        <section className="mx-auto max-w-3xl space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Perfil</h1>
            <p className="text-sm text-muted-foreground">
              Atualize suas informações públicas, avatar e senha.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/users/${user.username}`}>Ver perfil público</Link>
          </Button>
        </div>

        <ProfileSettingsForm initialProfile={profile} />
      </section>
    </PageShell>
  );
}
