import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  className?: string;
  alt?: string;
}

export function UserAvatar({ username, avatarUrl, className, alt }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarImage src={resolveAvatarUrl(username, avatarUrl)} alt={alt ?? username} />
      <AvatarFallback username={username} />
    </Avatar>
  );
}
