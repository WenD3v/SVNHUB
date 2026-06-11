import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { TeamDetailPanel } from "@/components/teams-panel";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { TeamDetail } from "@svnhub/shared";

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;

  const [team, users] = await Promise.all([
    apiFetch<TeamDetail>(`/teams/${slug}`),
    apiFetch<Array<{ id: string; username: string; email: string }>>("/users"),
  ]);

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/teams">← Teams</Link>
          </Button>
        </div>
        <TeamDetailPanel slug={slug} initialTeam={team} users={users} />
      </section>
    </PageShell>
  );
}
