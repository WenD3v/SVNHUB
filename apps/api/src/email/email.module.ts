import { Global, Module, forwardRef } from "@nestjs/common";

import { WebhooksModule } from "../webhooks/webhooks.module";
import { EmailService } from "./email.service";

@Global()
@Module({
  imports: [forwardRef(() => WebhooksModule)],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
