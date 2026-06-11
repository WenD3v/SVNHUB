import { describe, expect, it } from "vitest";

import { extractMentionedUsernames } from "./notifications.js";

describe("extractMentionedUsernames", () => {
  it("extracts unique usernames from comment bodies", () => {
    expect(extractMentionedUsernames("Olá @alice e @bob")).toEqual(["alice", "bob"]);
    expect(extractMentionedUsernames("@alice @alice @carol")).toEqual(["alice", "carol"]);
  });

  it("returns empty array when no mentions exist", () => {
    expect(extractMentionedUsernames("sem menções aqui")).toEqual([]);
  });
});
