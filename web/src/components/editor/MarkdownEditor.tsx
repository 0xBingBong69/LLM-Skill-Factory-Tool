import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

export function MarkdownEditor({
  value,
  onChange,
  height = "100%",
  readOnly = false,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  className?: string;
}) {
  const { resolved } = useTheme();
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={resolved}
      height={height}
      readOnly={readOnly}
      extensions={[markdown(), EditorView.lineWrapping]}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        autocompletion: false,
      }}
      className={cn("overflow-hidden rounded-md border text-sm", className)}
    />
  );
}
