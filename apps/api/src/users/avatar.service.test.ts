import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";
import { AvatarService } from "./avatar.service";

const sharpPipeline = {
  metadata: vi.fn(),
  extract: vi.fn(),
  resize: vi.fn(),
  webp: vi.fn(),
  toFile: vi.fn(),
};

vi.mock("sharp", () => ({
  default: vi.fn(() => sharpPipeline),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

function createService(deps: {
  prisma?: Partial<PrismaService>;
  audit?: Partial<AuditService>;
}) {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ...deps.prisma,
  } as unknown as PrismaService;

  const audit = {
    log: vi.fn(),
    ...deps.audit,
  } as unknown as AuditService;

  const config = {
    get: vi.fn().mockReturnValue(undefined),
  };

  return {
    service: new AvatarService(prisma, config as never, audit),
    prisma,
    audit,
  };
}

describe("AvatarService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharpPipeline.metadata.mockResolvedValue({ width: 400, height: 300 });
    sharpPipeline.extract.mockReturnValue(sharpPipeline);
    sharpPipeline.resize.mockReturnValue(sharpPipeline);
    sharpPipeline.webp.mockReturnValue(sharpPipeline);
    sharpPipeline.toFile.mockResolvedValue(undefined);
  });

  describe("validateUpload", () => {
    it("rejects files larger than 2 MB", () => {
      const { service } = createService({});

      expect(() =>
        service.validateUpload({
          buffer: Buffer.alloc(1),
          mimetype: "image/png",
          size: 2 * 1024 * 1024 + 1,
        }),
      ).toThrow(BadRequestException);
    });

    it("rejects unsupported mime types", () => {
      const { service } = createService({});

      expect(() =>
        service.validateUpload({
          buffer: Buffer.from("gif"),
          mimetype: "image/gif",
          size: 100,
        }),
      ).toThrow(BadRequestException);
    });

    it("accepts valid png uploads", () => {
      const { service } = createService({});

      expect(() =>
        service.validateUpload({
          buffer: Buffer.from("png"),
          mimetype: "image/png",
          size: 100,
        }),
      ).not.toThrow();
    });
  });

  describe("uploadAvatar", () => {
    it("processes image and updates avatarUrl", async () => {
      const { service, prisma, audit } = createService({
        prisma: {
          user: {
            findUnique: vi.fn().mockResolvedValue({ id: "user-1", username: "alice" }),
            update: vi.fn().mockResolvedValue({
              id: "user-1",
              email: "alice@example.com",
              username: "alice",
              displayName: "Alice",
              avatarUrl: "/users/alice/avatar?v=123",
              bio: null,
            }),
          },
        } as unknown as Partial<PrismaService>,
      });

      const result = await service.uploadAvatar("user-1", {
        buffer: Buffer.from("image"),
        mimetype: "image/jpeg",
        size: 100,
      });

      expect(sharpPipeline.extract).toHaveBeenCalled();
      expect(sharpPipeline.resize).toHaveBeenCalledWith(256, 256);
      expect(sharpPipeline.webp).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            avatarUrl: expect.stringMatching(/^\/users\/alice\/avatar\?v=/),
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "user.avatar.upload" }),
      );
      expect(result.username).toBe("alice");
    });

    it("throws when user does not exist", async () => {
      const { service } = createService({
        prisma: {
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
        } as unknown as Partial<PrismaService>,
      });

      await expect(
        service.uploadAvatar("missing", {
          buffer: Buffer.from("image"),
          mimetype: "image/png",
          size: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
