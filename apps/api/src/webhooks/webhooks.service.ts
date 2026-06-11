import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookEventType,
  WebhookSummary,
} from "@svnhub/shared";

import { PrismaService } from "../prisma/prisma.service";
import { WebhookQueueService } from "./webhook-queue.service";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookQueue: WebhookQueueService,
  ) {}

  async list(slug: string): Promise<WebhookSummary[]> {
    const repo = await this.requireRepo(slug);
    const webhooks = await this.prisma.webhook.findMany({
      where: { repositoryId: repo.id },
      orderBy: { createdAt: "desc" },
    });
    return webhooks.map((webhook) => this.toSummary(webhook));
  }

  async create(slug: string, input: CreateWebhookRequest): Promise<WebhookSummary> {
    const repo = await this.requireRepo(slug);
    const webhook = await this.prisma.webhook.create({
      data: {
        repositoryId: repo.id,
        url: input.url,
        secret: input.secret,
        events: input.events,
      },
    });
    return this.toSummary(webhook);
  }

  async update(
    slug: string,
    webhookId: string,
    input: UpdateWebhookRequest,
  ): Promise<WebhookSummary> {
    const repo = await this.requireRepo(slug);
    const existing = await this.prisma.webhook.findFirst({
      where: { id: webhookId, repositoryId: repo.id },
    });
    if (!existing) {
      throw new NotFoundException("Webhook not found");
    }

    const webhook = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        url: input.url,
        secret: input.secret,
        events: input.events,
        isActive: input.isActive,
      },
    });
    return this.toSummary(webhook);
  }

  async remove(slug: string, webhookId: string): Promise<void> {
    const repo = await this.requireRepo(slug);
    const existing = await this.prisma.webhook.findFirst({
      where: { id: webhookId, repositoryId: repo.id },
    });
    if (!existing) {
      throw new NotFoundException("Webhook not found");
    }
    await this.prisma.webhook.delete({ where: { id: webhookId } });
  }

  async enqueueDeliveries(
    event: WebhookEventType,
    input: {
      repositoryId: string;
      repositorySlug: string;
      data: Record<string, unknown>;
    },
  ): Promise<void> {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        repositoryId: input.repositoryId,
        isActive: true,
        events: { has: event },
      },
    });

    const payload = {
      event,
      repositoryId: input.repositoryId,
      repositorySlug: input.repositorySlug,
      timestamp: new Date().toISOString(),
      data: input.data,
    };

    await Promise.all(
      webhooks.map((webhook) =>
        this.webhookQueue.enqueueDelivery({
          webhookId: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          payload,
        }),
      ),
    );
  }

  private async requireRepo(slug: string) {
    const repo = await this.prisma.repository.findUnique({ where: { slug } });
    if (!repo) {
      throw new NotFoundException("Repository not found");
    }
    return repo;
  }

  private toSummary(webhook: {
    id: string;
    url: string;
    events: WebhookEventType[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): WebhookSummary {
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
      updatedAt: webhook.updatedAt.toISOString(),
    };
  }
}
