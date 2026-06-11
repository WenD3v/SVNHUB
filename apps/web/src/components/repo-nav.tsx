"use client";

import Link from "next/link";
import {
  BarChart3,
  CircleDot,
  Code2,
  GitBranch,
  GitCommitHorizontal,
  GitCompare,
  GitPullRequest,
  ScrollText,
  Settings,
  Tag,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface RepoNavProps {
  slug: string;
  active:
    | "code"
    | "commits"
    | "insights"
    | "changelog"
    | "branches"
    | "tags"
    | "compare"
    | "issues"
    | "pulls"
    | "pipelines"
    | "settings";
  openIssueCount?: number;
}

const TABS = [
  { id: "code" as const, label: "Code", href: (slug: string) => `/repos/${slug}`, icon: Code2 },
  {
    id: "commits" as const,
    label: "Commits",
    href: (slug: string) => `/repos/${slug}/commits`,
    icon: GitCommitHorizontal,
  },
  {
    id: "insights" as const,
    label: "Insights",
    href: (slug: string) => `/repos/${slug}/insights`,
    icon: BarChart3,
  },
  {
    id: "changelog" as const,
    label: "Changelog",
    href: (slug: string) => `/repos/${slug}/changelog`,
    icon: ScrollText,
  },
  {
    id: "issues" as const,
    label: "Issues",
    href: (slug: string) => `/repos/${slug}/issues`,
    icon: CircleDot,
    showOpenCount: true,
  },
  {
    id: "pulls" as const,
    label: "Pull requests",
    href: (slug: string) => `/repos/${slug}/pulls`,
    icon: GitPullRequest,
  },
  {
    id: "pipelines" as const,
    label: "Pipelines",
    href: (slug: string) => `/repos/${slug}/pipelines`,
    icon: Workflow,
  },
  {
    id: "branches" as const,
    label: "Branches",
    href: (slug: string) => `/repos/${slug}/branches`,
    icon: GitBranch,
  },
  {
    id: "tags" as const,
    label: "Releases",
    href: (slug: string) => `/repos/${slug}/tags`,
    icon: Tag,
  },
  {
    id: "compare" as const,
    label: "Compare",
    href: (slug: string) => `/repos/${slug}/compare`,
    icon: GitCompare,
  },
  {
    id: "settings" as const,
    label: "Settings",
    href: (slug: string) => `/repos/${slug}/settings`,
    icon: Settings,
  },
];

export function RepoNav({ slug, active, openIssueCount }: RepoNavProps) {
  return (
    <nav aria-label="Navegação do repositório" className="border-b border-border">
      <div className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href(slug)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" aria-hidden />
              {tab.label}
              {"showOpenCount" in tab && tab.showOpenCount && openIssueCount !== undefined ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal">
                  {openIssueCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
