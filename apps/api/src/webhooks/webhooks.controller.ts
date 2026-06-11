import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateWebhookDto, UpdateWebhookDto } from "./dto/webhook.dto";
import { WebhooksService } from "./webhooks.service";

@Controller("repositories/:slug/webhooks")
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  list(@Param("slug") slug: string) {
    return this.webhooksService.list(slug);
  }

  @Post()
  create(@Param("slug") slug: string, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(slug, dto);
  }

  @Patch(":webhookId")
  update(
    @Param("slug") slug: string,
    @Param("webhookId") webhookId: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(slug, webhookId, dto);
  }

  @Delete(":webhookId")
  remove(@Param("slug") slug: string, @Param("webhookId") webhookId: string) {
    return this.webhooksService.remove(slug, webhookId);
  }
}
