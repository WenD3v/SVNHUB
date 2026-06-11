import {
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import { RedisService } from "../queues/redis.service";

interface SubscribePayload {
  jobId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  },
  namespace: "/pipelines",
})
export class PipelineLogsGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly subscriptions = new Map<string, Set<string>>();
  private redisSubscriber: ReturnType<RedisService["duplicateSubscriber"]> | null = null;

  constructor(private readonly redisService: RedisService) {}

  onModuleInit(): void {
    this.redisSubscriber = this.redisService.duplicateSubscriber();
    void this.redisSubscriber.psubscribe("pipeline-logs:*", "pipeline-status:*");

    this.redisSubscriber.on("pmessage", (_pattern, channel, message) => {
      if (channel.startsWith("pipeline-logs:")) {
        const jobId = channel.slice("pipeline-logs:".length);
        const sockets = this.subscriptions.get(jobId);
        if (!sockets || sockets.size === 0) {
          return;
        }
        for (const socketId of sockets) {
          this.server.to(socketId).emit("pipeline-event", JSON.parse(message));
        }
        return;
      }

      if (channel.startsWith("pipeline-status:")) {
        const pipelineId = channel.slice("pipeline-status:".length);
        this.server.to(`pipeline:${pipelineId}`).emit("pipeline-event", JSON.parse(message));
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }
  }

  @SubscribeMessage("subscribe-job")
  handleSubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): void {
    const jobId = payload.jobId;
    const sockets = this.subscriptions.get(jobId) ?? new Set<string>();
    sockets.add(client.id);
    this.subscriptions.set(jobId, sockets);
    client.join(`job:${jobId}`);
  }

  @SubscribeMessage("unsubscribe-job")
  handleUnsubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): void {
    const sockets = this.subscriptions.get(payload.jobId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.subscriptions.delete(payload.jobId);
      }
    }
    client.leave(`job:${payload.jobId}`);
  }

  @SubscribeMessage("subscribe-pipeline")
  handleSubscribePipeline(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pipelineId: string },
  ): void {
    client.join(`pipeline:${payload.pipelineId}`);
  }
}
