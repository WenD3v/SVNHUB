import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

import { WebhookQueueService, type EmailJob } from "../webhooks/webhook-queue.service";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookQueue: WebhookQueueService,
  ) {}

  isEnabled(): boolean {
    return this.configService.get<string>("SMTP_ENABLED") === "true";
  }

  async enqueueEmail(job: EmailJob): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.webhookQueue.enqueueEmail(job);
  }

  async sendPasswordResetEmail(input: {
    email: string;
    username: string;
    password: string;
  }): Promise<void> {
    await this.enqueueEmail({
      to: input.email,
      subject: "SVNHUB — senha redefinida",
      text: [
        `Olá ${input.username},`,
        "",
        "Um administrador redefiniu sua senha no SVNHUB.",
        `Nova senha temporária: ${input.password}`,
        "",
        "Altere-a em Configurações → Perfil após o próximo login.",
      ].join("\n"),
    });
  }

  async sendMentionEmail(input: {
    email: string;
    username: string;
    authorUsername: string;
    repositorySlug: string;
    context: "pull_request" | "issue";
    contextNumber: number;
    excerpt: string;
  }): Promise<void> {
    const webOrigin = this.configService.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
    const path =
      input.context === "pull_request"
        ? `/repos/${input.repositorySlug}/pulls/${input.contextNumber}`
        : `/repos/${input.repositorySlug}/issues/${input.contextNumber}`;
    const url = `${webOrigin}${path}`;

    await this.enqueueEmail({
      to: input.email,
      subject: `SVNHUB — @${input.authorUsername} mencionou você`,
      text: [
        `Olá ${input.username},`,
        "",
        `@${input.authorUsername} mencionou você em ${input.repositorySlug}:`,
        input.excerpt,
        "",
        url,
      ].join("\n"),
      html: `<p>Olá ${input.username},</p><p><strong>@${input.authorUsername}</strong> mencionou você em <strong>${input.repositorySlug}</strong>:</p><blockquote>${input.excerpt}</blockquote><p><a href="${url}">Abrir conversa</a></p>`,
    });
  }

  async deliver(job: EmailJob): Promise<void> {
    const host = this.configService.getOrThrow<string>("SMTP_HOST");
    const port = Number(this.configService.get<string>("SMTP_PORT") ?? 587);
    const secure = this.configService.get<string>("SMTP_SECURE") === "true";
    const user = this.configService.get<string>("SMTP_USER");
    const pass = this.configService.get<string>("SMTP_PASS");
    const from = this.configService.get<string>("SMTP_FROM") ?? "svnhub@localhost";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: job.to,
      subject: job.subject,
      text: job.text,
      html: job.html,
    });

    this.logger.debug(`Email sent to ${job.to}`);
  }
}
