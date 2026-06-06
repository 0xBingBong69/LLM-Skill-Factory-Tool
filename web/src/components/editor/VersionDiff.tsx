import { useEffect, useRef } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "@/providers/theme-provider";

/** Side-by-side version comparison using CodeMirror's MergeView. */
export function VersionDiff({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    if (!ref.current) return;
    const extensions = [
      markdown(),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      ...(resolved === "dark" ? [oneDark] : []),
    ];
    const view = new MergeView({
      a: { doc: left, extensions },
      b: { doc: right, extensions },
      parent: ref.current,
      collapseUnchanged: { margin: 3, minSize: 4 },
    });
    return () => view.destroy();
  }, [left, right, resolved]);

  return (
    <div>
      {(leftLabel || rightLabel) && (
        <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
      <div ref={ref} className="overflow-auto rounded-md border text-sm [&_.cm-mergeView]:max-h-[60vh]" />
    </div>
  );
}
