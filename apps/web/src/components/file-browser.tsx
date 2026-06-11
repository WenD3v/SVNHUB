import Link from "next/link";
import { File, Folder } from "lucide-react";

import type { SvnTreeEntry } from "@svnhub/shared";

interface FileBrowserProps {
  slug: string;
  branchRef: string;
  path: string;
  revision: number;
  entries: SvnTreeEntry[];
}

export function FileBrowser({ slug, branchRef, path, revision, entries }: FileBrowserProps) {
  const sorted = [...entries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        {branchRef}
        {path ? ` / ${path}` : ""} @ r{revision}
      </div>
      <ul className="divide-y divide-border">
        {sorted.map((entry) => {
          const nextPath = path ? `${path}/${entry.name}` : entry.name;
          const href =
            entry.kind === "dir"
              ? `/repos/${slug}/tree/${nextPath}?ref=${branchRef}&revision=${revision}`
              : `/repos/${slug}/blob/${nextPath}?ref=${branchRef}&revision=${revision}`;

          return (
            <li key={entry.path}>
              <Link
                href={href}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent/40"
              >
                {entry.kind === "dir" ? (
                  <Folder className="size-4 text-primary" />
                ) : (
                  <File className="size-4 text-muted-foreground" />
                )}
                <span>{entry.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
