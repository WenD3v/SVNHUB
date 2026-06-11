import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "ldapts";

export interface LdapUserProfile {
  dn: string;
  email: string;
  username: string;
  displayName: string | null;
}

@Injectable()
export class LdapService {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>("LDAP_URL"));
  }

  async authenticate(email: string, password: string): Promise<LdapUserProfile | null> {
    const url = this.config.get<string>("LDAP_URL");
    const searchBase = this.config.get<string>("LDAP_SEARCH_BASE");
    const searchFilter =
      this.config.get<string>("LDAP_SEARCH_FILTER") ??
      "(|(mail={email})(userPrincipalName={email}))";

    if (!url || !searchBase) {
      return null;
    }

    const client = new Client({ url });
    const bindDn = this.config.get<string>("LDAP_BIND_DN");
    const bindPassword = this.config.get<string>("LDAP_BIND_PASSWORD");

    try {
      if (bindDn && bindPassword) {
        await client.bind(bindDn, bindPassword);
      }

      const filter = searchFilter.replaceAll("{email}", email);
      const { searchEntries } = await client.search(searchBase, {
        scope: "sub",
        filter,
        attributes: ["dn", "mail", "userPrincipalName", "sAMAccountName", "displayName", "cn"],
      });

      const entry = searchEntries[0];
      if (!entry?.dn) {
        return null;
      }

      await client.bind(entry.dn, password);

      const mail = this.firstString(entry.mail) ?? email;
      const username =
        this.firstString(entry.sAMAccountName) ??
        this.firstString(entry.userPrincipalName)?.split("@")[0] ??
        mail.split("@")[0];

      return {
        dn: entry.dn,
        email: mail,
        username,
        displayName:
          this.firstString(entry.displayName) ?? this.firstString(entry.cn) ?? null,
      };
    } catch {
      return null;
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }

  private firstString(value: unknown): string | undefined {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }

    return undefined;
  }
}
