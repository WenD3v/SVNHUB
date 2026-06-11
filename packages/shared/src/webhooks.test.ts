import { describe, expect, it } from "vitest";

import {
  signWebhookPayload,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from "./webhooks.js";

describe("webhook HMAC signature", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ event: "PIPELINE_COMPLETED", id: "p1" });

  it("signs payload with sha256 prefix", () => {
    const signature = signWebhookPayload(secret, body);
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("verifies valid signature", () => {
    const signature = signWebhookPayload(secret, body);
    expect(verifyWebhookSignature(secret, body, signature)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyWebhookSignature(secret, body, "sha256=invalid")).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(verifyWebhookSignature(secret, body, undefined)).toBe(false);
  });

  it("exports signature header constant", () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe("X-Svnhub-Signature-256");
  });
});
