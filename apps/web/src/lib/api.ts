export { apiFetch } from "./api-client";

export function getExportUrl(
  slug: string,
  params: { ref?: string; path?: string; revision?: number },
): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();
  if (params.ref) search.set("ref", params.ref);
  if (params.path) search.set("path", params.path);
  if (params.revision) search.set("revision", String(params.revision));
  const query = search.toString();
  return `${baseUrl}/repositories/${slug}/export${query ? `?${query}` : ""}`;
}
