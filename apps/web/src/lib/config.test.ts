import { describe, expect, it } from "vitest";

import { getApiBaseUrl } from "./config";

describe("web config", () => {
  it("defaults API base URL for local development", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });
});
