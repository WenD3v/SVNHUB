import type { SvnTreeEntry } from "@svnhub/shared";

import { asArray, intValue, parseXml, textValue } from "./xml.util";

interface RawListXml {
  lists?: {
    list?: RawList | RawList[];
  };
}

interface RawList {
  "@_path"?: string;
  entry?: RawEntry | RawEntry[];
}

interface RawEntry {
  "@_kind"?: string;
  name?: unknown;
  size?: unknown;
}

export function parseListXml(xml: string, parentPath: string): SvnTreeEntry[] {
  const doc = parseXml<RawListXml>(xml);
  const lists = asArray(doc.lists?.list);
  const list = lists[0];
  const entries = asArray(list?.entry);
  const normalizedParent = parentPath === "/" ? "" : parentPath.replace(/\/$/, "");

  return entries.map((entry) => {
    const name = textValue(entry.name);
    const path = normalizedParent ? `${normalizedParent}/${name}` : `/${name}`;

    return {
      name,
      path,
      kind: entry["@_kind"] === "dir" ? "dir" : "file",
      size: entry.size !== undefined ? intValue(entry.size) : undefined,
    };
  });
}
