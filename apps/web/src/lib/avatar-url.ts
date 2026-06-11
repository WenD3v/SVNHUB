import { getApiBaseUrl } from "@/lib/config";

export function resolveAvatarUrl(
  username: string,
  avatarUrl?: string | null,
): string {
  const path = avatarUrl ?? `/users/${username}/avatar`;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${getApiBaseUrl()}${path}`;
}
