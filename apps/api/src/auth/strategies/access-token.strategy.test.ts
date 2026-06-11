import { UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { AccessTokenStrategy } from "./access-token.strategy";
import type { PrismaService } from "../../prisma/prisma.service";

describe("AccessTokenStrategy", () => {
  function createStrategy(storedToken: {
    id: string;
    scopes: string[];
    user: { id: string; email: string; username: string };
  } | null) {
    const prisma = {
      accessToken: {
        findFirst: vi.fn().mockResolvedValue(storedToken),
        update: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as PrismaService;

    return new AccessTokenStrategy(prisma);
  }

  it("returns null when authorization header is missing", async () => {
    const strategy = createStrategy(null);
    await expect(strategy.validate({ headers: {} })).resolves.toBeNull();
  });

  it("returns null for non personal access tokens", async () => {
    const strategy = createStrategy(null);
    await expect(
      strategy.validate({ headers: { authorization: "Bearer jwt-token" } }),
    ).resolves.toBeNull();
  });

  it("rejects invalid personal access tokens", async () => {
    const strategy = createStrategy(null);
    await expect(
      strategy.validate({ headers: { authorization: "Bearer svnhub_invalid" } }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns authenticated user for valid personal access token", async () => {
    const rawToken = "svnhub_test_token";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const strategy = createStrategy({
      id: "token-1",
      scopes: ["repo:read", "repo:write"],
      user: { id: "user-1", email: "dev@svnhub.local", username: "dev" },
    });

    await expect(
      strategy.validate({ headers: { authorization: `Bearer ${rawToken}` } }),
    ).resolves.toEqual({
      id: "user-1",
      email: "dev@svnhub.local",
      username: "dev",
      tokenScopes: ["repo:read", "repo:write"],
    });

    expect(tokenHash).toHaveLength(64);
  });
});
