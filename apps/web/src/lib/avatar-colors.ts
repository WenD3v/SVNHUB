const AVATAR_COLORS = [
  "bg-[#0969da] text-white",
  "bg-[#1a7f37] text-white",
  "bg-[#8250df] text-white",
  "bg-[#bf3989] text-white",
  "bg-[#cf222e] text-white",
  "bg-[#9a6700] text-white",
  "bg-[#0550ae] text-white",
  "bg-[#6639ba] text-white",
];

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarColorClass(username: string): string {
  return AVATAR_COLORS[hashString(username) % AVATAR_COLORS.length];
}

export function getInitials(username: string): string {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}
