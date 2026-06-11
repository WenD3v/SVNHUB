import Link from "next/link";

import type { SvnLogEntry } from "@svnhub/shared";

interface CommitHistoryProps {
  slug: string;
  entries: SvnLogEntry[];
}

export function CommitHistory({ slug, entries }: CommitHistoryProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma revisão encontrada.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {entries.map((entry) => (
        <li key={entry.revision}>
          <Link
            href={`/repos/${slug}/commit/${entry.revision}`}
            className="block px-4 py-3 hover:bg-accent/40"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{entry.message || "(sem mensagem)"}</p>
              <span className="text-xs text-muted-foreground">r{entry.revision}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.author} · {new Date(entry.date).toLocaleString("pt-BR")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
