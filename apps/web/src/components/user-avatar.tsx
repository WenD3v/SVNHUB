import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  className?: string;
  alt?: string;
  /** When true, initials render on brand background instead of hashed color. */
  brandFallback?: boolean;
}

export function UserAvatar({
  username,
  avatarUrl,
  className,
  alt,
  brandFallback = false,
}: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarImage src={resolveAvatarUrl(username, avatarUrl)} alt={alt ?? username} />
      <AvatarFallback
        username={username}
        className={
          brandFallback
            ? "bg-brand font-display text-lg font-bold text-primary-foreground"
            : undefined
        }
      />
    </Avatar>
  );
}
