import type { SvnChangedPath, SvnLogEntry } from "@svnhub/shared";

import { asArray, intValue, parseXml, textValue } from "./xml.util";

interface RawLogXml {
  log?: {
    logentry?: RawLogEntry | RawLogEntry[];
  };
}

interface RawLogEntry {
  "@_revision"?: string;
  author?: unknown;
  date?: unknown;
  msg?: unknown;
  paths?: {
    path?: RawPath | RawPath[];
  };
}

interface RawPath {
  "@_action"?: string;
  "@_copyfrom-path"?: string;
  "@_copyfrom-rev"?: string;
  "#text"?: string;
}

export function parseLogXml(xml: string): SvnLogEntry[] {
  const doc = parseXml<RawLogXml>(xml);
  const entries = asArray(doc.log?.logentry);

  return entries.map((entry) => {
    const paths = asArray(entry.paths?.path).map((path): SvnChangedPath => ({
      path: textValue(path["#text"] ?? path),
      action: (path["@_action"] ?? "M") as SvnChangedPath["action"],
      copyFromPath: path["@_copyfrom-path"] || undefined,
      copyFromRev: path["@_copyfrom-rev"]
        ? intValue(path["@_copyfrom-rev"])
        : undefined,
    }));

    return {
      revision: intValue(entry["@_revision"]),
      author: textValue(entry.author),
      date: textValue(entry.date),
      message: textValue(entry.msg),
      paths,
    };
  });
}
