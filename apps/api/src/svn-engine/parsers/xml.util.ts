import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  isArray: (name) =>
    ["logentry", "entry", "path", "list", "target", "blame", "hunk"].includes(name),
});

export function parseXml<T>(xml: string): T {
  return parser.parse(xml) as T;
}

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function textValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && value !== null && "#text" in value) {
    return String((value as { "#text": unknown })["#text"]);
  }
  return String(value);
}

export function intValue(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(textValue(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
