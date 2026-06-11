import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    this.client = new Redis(url, { maxRetriesPerRequest: null });
    this.subscriber = new Redis(url, { maxRetriesPerRequest: null });
  }

  get redis(): Redis {
    return this.client;
  }

  get pubSub(): Redis {
    return this.subscriber;
  }

  duplicateSubscriber(): Redis {
    const url = this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379";
    return new Redis(url, { maxRetriesPerRequest: null });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }
}
