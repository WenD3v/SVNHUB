"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Usuários" },
  { href: "/teams", label: "Teams" },
  { href: "/admin/audit-log", label: "Auditoria" },
  { href: "/admin/backups", label: "Backups" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex flex-wrap gap-1 border-b border-border">
      {ADMIN_LINKS.map((link) => {
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
