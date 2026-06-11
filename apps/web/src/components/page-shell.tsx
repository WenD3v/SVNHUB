import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className={className ?? "flex-1"}>{children}</div>
      <AppFooter />
    </div>
  );
}
