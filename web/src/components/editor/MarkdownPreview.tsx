import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils";

/** Sanitized markdown rendering (content is LLM-generated, so never trust raw HTML). */
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Nothing to preview yet.</p>;
  }
  return (
    <div className={cn("prose-skill", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
