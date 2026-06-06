import { type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, XCircle } from "lucide-react";
import type { ValidationReport } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function Row({ icon, text, className }: { icon: ReactNode; text: string; className: string }) {
  return (
    <div className={cn("flex items-start gap-2 rounded-md border p-2 text-sm", className)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export function ValidationPanel({
  report,
  loading,
}: {
  report?: ValidationReport;
  loading?: boolean;
}) {
  if (loading && !report) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Validating…
      </p>
    );
  }
  if (!report) {
    return <p className="text-sm text-muted-foreground">Validation results will appear here.</p>;
  }

  const clean = report.ok && report.warnings.length === 0 && report.suggestions.length === 0;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{report.summary}</p>
      {clean && (
        <Row
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          text="Looks great — no issues found."
          className="border-success/40 bg-success/5"
        />
      )}
      {report.errors.map((e, i) => (
        <Row
          key={`e${i}`}
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          text={e}
          className="border-destructive/40 bg-destructive/5"
        />
      ))}
      {report.warnings.map((w, i) => (
        <Row
          key={`w${i}`}
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          text={w}
          className="border-warning/40 bg-warning/5"
        />
      ))}
      {report.suggestions.map((s, i) => (
        <Row
          key={`s${i}`}
          icon={<Lightbulb className="h-4 w-4 text-info" />}
          text={s}
          className="border-info/40 bg-info/5"
        />
      ))}
    </div>
  );
}
