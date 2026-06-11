import { CreateRepositoryForm } from "@/components/create-repository-form";
import { PageShell } from "@/components/page-shell";
import { RepositoryListLoader } from "@/components/repository-list-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repositórios</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie e navegue pelos repositórios SVN da instância.
            </p>
          </div>
          <RepositoryListLoader />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Novo repositório</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateRepositoryForm />
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
