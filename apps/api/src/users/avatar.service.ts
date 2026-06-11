import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UserProfile } from "@svnhub/shared";
import { buildAvatarUrl } from "@svnhub/shared";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { AuditService } from "../audit/audit.service";
import { resolveDataPath } from "../common/paths";
import { PrismaService } from "../prisma/prisma.service";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const AVATAR_SIZE = 256;

export interface AvatarUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class AvatarService {
  private readonly avatarsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.avatarsDir = resolveDataPath(
      this.configService.get<string>("AVATARS_DIR") ?? "data/avatars",
    );
  }

  getAvatarFilePath(userId: string): string {
    return path.join(this.avatarsDir, `${userId}.webp`);
  }

  async uploadAvatar(
    userId: string,
    file: AvatarUploadFile,
    ipAddress?: string | null,
  ): Promise<UserProfile> {
    this.validateUpload(file);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await mkdir(this.avatarsDir, { recursive: true });

    const outputPath = this.getAvatarFilePath(userId);
    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException("Invalid image file");
    }

    const squareSize = Math.min(metadata.width, metadata.height);
    const left = Math.floor((metadata.width - squareSize) / 2);
    const top = Math.floor((metadata.height - squareSize) / 2);

    await image
      .extract({ left, top, width: squareSize, height: squareSize })
      .resize(AVATAR_SIZE, AVATAR_SIZE)
      .webp({ quality: 85 })
      .toFile(outputPath);

    const version = Date.now();
    const avatarUrl = buildAvatarUrl(user.username, version);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    await this.auditService.log({
      userId,
      action: "user.avatar.upload",
      resourceType: "user",
      resourceId: userId,
      ipAddress,
    });

    return updated;
  }

  async removeAvatar(userId: string, ipAddress?: string | null): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    try {
      await unlink(this.getAvatarFilePath(userId));
    } catch {
      // file may already be absent
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    await this.auditService.log({
      userId,
      action: "user.avatar.remove",
      resourceType: "user",
      resourceId: userId,
      ipAddress,
    });

    return updated;
  }

  validateUpload(file: AvatarUploadFile): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Avatar file is required");
    }

    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException("Avatar file must be 2 MB or smaller");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Avatar must be a PNG, JPEG or WebP image");
    }
  }
}
