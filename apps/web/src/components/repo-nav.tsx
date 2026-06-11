import Link from "next/link";

interface RepoNavProps {
  slug: string;
  active:
    | "code"
    | "commits"
    | "branches"
    | "tags"
    | "compare"
    | "pulls"
    | "pipelines"
    | "settings";
}

export function RepoNav({ slug, active }: RepoNavProps) {
  const tabs = [
    { id: "code" as const, label: "Código", href: `/repos/${slug}` },
    { id: "commits" as const, label: "Commits", href: `/repos/${slug}/commits` },
    { id: "pulls" as const, label: "Pull requests", href: `/repos/${slug}/pulls` },
    { id: "pipelines" as const, label: "Pipelines", href: `/repos/${slug}/pipelines` },
    { id: "branches" as const, label: "Branches", href: `/repos/${slug}/branches` },
    { id: "tags" as const, label: "Releases", href: `/repos/${slug}/tags` },
    { id: "compare" as const, label: "Compare", href: `/repos/${slug}/compare` },
    { id: "settings" as const, label: "Settings", href: `/repos/${slug}/settings` },
  ];

  return (
    <nav className="flex gap-4 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={
            active === tab.id
              ? "border-b-2 border-primary px-1 py-2 text-sm font-medium"
              : "px-1 py-2 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
