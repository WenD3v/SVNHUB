import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

import { Public } from "../common/decorators/public.decorator";

@Controller("health")
@SkipThrottle()
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return { status: "ok", service: "api" };
  }
}
