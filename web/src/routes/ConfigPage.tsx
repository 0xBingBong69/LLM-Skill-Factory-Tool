import { FileText, KeyRound, Library } from "lucide-react";
import { useConfig } from "@/lib/queries";
import { PageHeader } from "@/components/common/PageHeader";
import { ApiKeyForm } from "@/components/common/ApiKeyForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatItem({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2 truncate text-sm font-medium">
          {value}
          {ok !== undefined && (
            <Badge variant={ok ? "success" : "warning"}>{ok ? "ready" : "not set"}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const { data: config } = useConfig();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Configuration" description="Connect OpenRouter and review your environment." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">OpenRouter</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiKeyForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <StatItem
            icon={<KeyRound className="h-5 w-5" />}
            label="API key"
            value={config?.has_key ? "Configured" : "Missing"}
            ok={config?.has_key}
          />
          <StatItem
            icon={<Library className="h-5 w-5" />}
            label="Skills in library"
            value={String(config?.skill_count ?? 0)}
          />
          <StatItem
            icon={<FileText className="h-5 w-5" />}
            label="PDF extraction"
            value={config?.pdf_available ? "Available" : "Off"}
            ok={config?.pdf_available}
          />
          <StatItem
            icon={<FileText className="h-5 w-5" />}
            label="Skills directory"
            value={config?.skills_dir ?? "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
