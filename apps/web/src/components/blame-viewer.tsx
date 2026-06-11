import Link from "next/link";

import type { SvnBlameLine } from "@svnhub/shared";

interface BlameViewerProps {
  slug: string;
  lines: SvnBlameLine[];
}

export function BlameViewer({ slug, lines }: BlameViewerProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border font-mono text-xs">
      <table className="w-full">
        <tbody>
          {lines.map((line) => (
            <tr key={line.lineNumber} className="border-b border-border/50 hover:bg-accent/20">
              <td className="w-16 select-none px-2 py-1 text-right text-muted-foreground">
                {line.lineNumber}
              </td>
              <td className="w-16 select-none px-2 py-1 text-right text-muted-foreground">
                <Link href={`/repos/${slug}/commit/${line.revision}`} className="hover:underline">
                  r{line.revision}
                </Link>
              </td>
              <td className="w-32 select-none px-2 py-1 text-muted-foreground">{line.author}</td>
              <td className="whitespace-pre px-2 py-1">{line.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
