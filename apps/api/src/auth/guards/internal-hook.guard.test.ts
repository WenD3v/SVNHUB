import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import { InternalHookGuard } from "./internal-hook.guard";

describe("InternalHookGuard", () => {
  it("rejects requests with invalid hook secret", () => {
    const guard = new InternalHookGuard(
      new ConfigService({ INTERNAL_HOOK_SECRET: "expected-secret" }),
    );

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { "x-hook-secret": "wrong-secret" },
        }),
      }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
  });

  it("allows requests with valid hook secret", () => {
    const guard = new InternalHookGuard(
      new ConfigService({ INTERNAL_HOOK_SECRET: "expected-secret" }),
    );

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { "x-hook-secret": "expected-secret" },
        }),
      }),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });
});
