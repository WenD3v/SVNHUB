import type { SvnBlameLine } from "@svnhub/shared";

import { asArray, intValue, parseXml, textValue } from "./xml.util";

interface RawBlameXml {
  blame?: RawBlameRoot | RawBlameRoot[];
}

interface RawBlameRoot {
  target?: RawBlameTarget | RawBlameTarget[];
}

interface RawBlameTarget {
  path?: unknown;
  entry?: RawBlameEntry | RawBlameEntry[];
}

interface RawBlameEntry {
  "@_line-number"?: string;
  commit?: {
    "@_revision"?: string;
    author?: unknown;
    date?: unknown;
  };
  line?: unknown;
}

export function parseBlameXml(xml: string): SvnBlameLine[] {
  const doc = parseXml<RawBlameXml>(xml);
  const blameRoot = asArray(doc.blame)[0];
  const target = asArray(blameRoot?.target)[0];
  const entries = asArray(target?.entry);

  return entries.map((entry) => ({
    lineNumber: intValue(entry["@_line-number"]),
    revision: intValue(entry.commit?.["@_revision"]),
    author: textValue(entry.commit?.author),
    date: textValue(entry.commit?.date),
    text: textValue(entry.line),
  }));
}
