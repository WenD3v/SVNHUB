import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RunnerSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const runnerSecret = request.headers["x-runner-secret"];
    const expected = this.configService.getOrThrow<string>("RUNNER_SECRET");

    if (!runnerSecret || runnerSecret !== expected) {
      throw new UnauthorizedException("Invalid runner secret");
    }

    return true;
  }
}
