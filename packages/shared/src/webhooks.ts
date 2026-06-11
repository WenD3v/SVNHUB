import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookEventType =
  | "REVISION_INDEXED"
  | "PIPELINE_COMPLETED"
  | "PR_MERGED";

export interface WebhookSummary {
  id: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  secret: string;
  events: WebhookEventType[];
}

export interface UpdateWebhookRequest {
  url?: string;
  secret?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
}

export interface WebhookDeliveryPayload {
  event: WebhookEventType;
  repositoryId: string;
  repositorySlug: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export const WEBHOOK_SIGNATURE_HEADER = "X-Svnhub-Signature-256";

export function signWebhookPayload(secret: string, body: string): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string | undefined,
): boolean {
  if (!signature) {
    return false;
  }
  const expected = signWebhookPayload(secret, body);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
