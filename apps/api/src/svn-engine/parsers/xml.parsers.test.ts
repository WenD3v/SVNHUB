import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseBlameXml } from "../parsers/blame.parser";
import { parseInfoXml } from "../parsers/info.parser";
import { parseListXml } from "../parsers/list.parser";
import { parseLogXml } from "../parsers/log.parser";

const fixturesDir = path.join(__dirname, "..", "__tests__", "fixtures");

function readFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf8");
}

describe("SVN XML parsers", () => {
  it("parses log xml", () => {
    const entries = parseLogXml(readFixture("log.xml"));
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      revision: 2,
      author: "dev",
      message: "Add README",
    });
    expect(entries[0]?.paths[0]).toEqual({ path: "/trunk/README.md", action: "A" });
  });

  it("parses info xml", () => {
    const info = parseInfoXml(readFixture("info.xml"));
    expect(info).toMatchObject({
      repositoryRoot: "file:///tmp/demo.svn",
      uuid: "abc-123",
      revision: 2,
      lastChangedAuthor: "dev",
    });
  });

  it("parses list xml", () => {
    const entries = parseListXml(readFixture("list.xml"), "/trunk");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ name: "src", kind: "dir", path: "/trunk/src" });
    expect(entries[1]).toMatchObject({ name: "README.md", kind: "file", size: 42 });
  });

  it("parses blame xml", () => {
    const lines = parseBlameXml(readFixture("blame.xml"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      lineNumber: 1,
      revision: 2,
      author: "dev",
      text: "# Demo",
    });
  });
});
