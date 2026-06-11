import { describe, expect, it } from "vitest";

import { sanitizeCliArg } from "./svn-cli.executor";

describe("SvnCliExecutor sanitization", () => {
  it("accepts safe arguments", () => {
    expect(sanitizeCliArg("file:///tmp/repo.svn/trunk")).toBe("file:///tmp/repo.svn/trunk");
    expect(sanitizeCliArg("--xml")).toBe("--xml");
  });

  it("rejects shell chaining metacharacters", () => {
    expect(() => sanitizeCliArg("foo; rm -rf /")).toThrow(/Unsafe/);
    expect(() => sanitizeCliArg("$(whoami)")).toThrow(/Unsafe/);
    expect(() => sanitizeCliArg("path|other")).toThrow(/Unsafe/);
  });

  it("allows Windows short paths", () => {
    expect(sanitizeCliArg(String.raw`C:\Users\ADMINI~1\AppData\Local\Temp\repo.svn`)).toContain(
      "repo.svn",
    );
  });
});
