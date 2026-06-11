import type { SvnRepoInfo } from "@svnhub/shared";

import { asArray, intValue, parseXml, textValue } from "./xml.util";

interface RawInfoXml {
  info?: {
    entry?: RawInfoEntry | RawInfoEntry[];
  };
}

interface RawInfoEntry {
  "@_revision"?: string;
  url?: unknown;
  repository?: {
    root?: unknown;
    uuid?: unknown;
  };
  commit?: {
    "@_revision"?: string;
    author?: unknown;
    date?: unknown;
  };
}

export function parseInfoXml(xml: string): SvnRepoInfo {
  const doc = parseXml<RawInfoXml>(xml);
  const entry = asArray(doc.info?.entry)[0];

  if (!entry) {
    throw new Error("Invalid svn info XML: missing entry");
  }

  return {
    repositoryRoot: textValue(entry.repository?.root),
    uuid: textValue(entry.repository?.uuid),
    revision: intValue(entry["@_revision"]),
    lastChangedRev: entry.commit?.["@_revision"]
      ? intValue(entry.commit["@_revision"])
      : undefined,
    lastChangedDate: entry.commit?.date ? textValue(entry.commit.date) : undefined,
    lastChangedAuthor: entry.commit?.author ? textValue(entry.commit.author) : undefined,
  };
}
