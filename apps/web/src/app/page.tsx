import { AppHeader } from "@/components/app-header";
import { CreateRepositoryForm } from "@/components/create-repository-form";
import { RepositoryListLoader } from "@/components/repository-list-loader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Repositórios</h1>
          <RepositoryListLoader />
        </div>
        <CreateRepositoryForm />
      </section>
    </main>
  );
}
