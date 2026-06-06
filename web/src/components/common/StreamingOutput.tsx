import { Loader2 } from "lucide-react";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";

/** Live model output: streams tokens into a sanitized markdown surface. */
export function StreamingOutput({ text, streaming }: { text: string; streaming: boolean }) {
  if (!text && !streaming) return null;
  return (
    <div aria-live="polite" className="rounded-md border bg-card p-4">
      {streaming && !text && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Running…
        </p>
      )}
      {text && <MarkdownPreview content={text} />}
      {streaming && text && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />
      )}
    </div>
  );
}
