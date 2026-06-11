import { describe, expect, it } from "vitest";

import type { AuthResponse } from "./auth.js";

describe("@svnhub/shared", () => {
  it("exports shared auth contract types", () => {
    const sample: AuthResponse = {
      user: {
        id: "user-1",
        email: "dev@svnhub.local",
        username: "dev",
        displayName: "Developer",
        avatarUrl: null,
        isAdmin: false,
      },
      tokens: {
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 900,
      },
    };

    expect(sample.user.username).toBe("dev");
    expect(sample.tokens.expiresIn).toBeGreaterThan(0);
  });
});
