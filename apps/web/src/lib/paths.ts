export function joinPathSegments(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) {
    return "";
  }
  return segments.map((segment) => decodeURIComponent(segment)).join("/");
}

export function extensionToLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    sh: "bash",
    xml: "xml",
    css: "css",
    html: "html",
  };
  return map[ext ?? ""] ?? "typescript";
}
