import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class InternalHookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const hookSecret = request.headers["x-hook-secret"];
    const expected = this.configService.getOrThrow<string>("INTERNAL_HOOK_SECRET");

    if (!hookSecret || hookSecret !== expected) {
      throw new UnauthorizedException("Invalid hook secret");
    }

    return true;
  }
}
