import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReadmeViewerProps {
  content: string;
}

export function ReadmeViewer({ content }: ReadmeViewerProps) {
  return (
    <article className="prose prose-invert max-w-none rounded-lg border border-border p-4 text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
