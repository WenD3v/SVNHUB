import type { SvnDiffFile } from "@svnhub/shared";

import { asArray, parseXml, textValue } from "./xml.util";

interface RawDiffXml {
  diff?: {
    paths?: {
      path?: RawDiffPath | RawDiffPath[];
    };
  };
}

interface RawDiffPath {
  "@_props"?: string;
  "@_kind"?: string;
  "@_item"?: string;
  "#text"?: string;
  old?: unknown;
  new?: unknown;
}

export function parseDiffXml(xml: string): SvnDiffFile[] {
  const doc = parseXml<RawDiffXml>(xml);
  const paths = asArray(doc.diff?.paths?.path);

  return paths.map((path) => ({
    path: textValue(path["#text"] ?? path),
    kind: path["@_kind"] === "dir" ? "dir" : "file",
    action: mapDiffAction(path["@_item"]),
    diff: buildUnifiedDiff(path),
  }));
}

export function parseUnifiedDiff(output: string): SvnDiffFile[] {
  if (!output.trim()) {
    return [];
  }

  const chunks = output.split(/^Index: /m).filter(Boolean);
  return chunks.map((chunk) => {
    const lines = chunk.split(/\r?\n/);
    const path = lines[0]?.trim() ?? "unknown";
    const diff = `Index: ${chunk}`.trim();

    let action: SvnDiffFile["action"] = "M";
    if (diff.includes("Cannot display:") || diff.includes("(deleted)")) {
      action = "D";
    } else if (diff.includes("(added)")) {
      action = "A";
    }

    return {
      path: path.startsWith("/") ? path : `/${path}`,
      kind: "file",
      action,
      diff,
    };
  });
}

function mapDiffAction(item?: string): SvnDiffFile["action"] {
  switch (item) {
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "replaced":
      return "R";
    case "modified":
    default:
      return "M";
  }
}

function buildUnifiedDiff(path: RawDiffPath): string | undefined {
  const oldLines = extractDiffLines(path.old);
  const newLines = extractDiffLines(path.new);

  if (oldLines.length === 0 && newLines.length === 0) {
    return undefined;
  }

  const header = `--- ${textValue(path)}\n+++ ${textValue(path)}\n`;
  const body = [...oldLines, ...newLines].join("\n");
  return `${header}${body}`.trim();
}

function extractDiffLines(section: unknown): string[] {
  if (!section || typeof section !== "object") {
    return [];
  }

  const typed = section as { text?: unknown };
  const text = textValue(typed.text);
  if (!text) {
    return [];
  }

  return text.split(/\r?\n/).map((line) => {
    if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
      return line;
    }
    return ` ${line}`;
  });
}
