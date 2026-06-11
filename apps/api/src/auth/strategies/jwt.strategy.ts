import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  /** Present only for personal access token authentication. */
  tokenScopes?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  validate(payload: { sub: string; email: string; username: string }): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
