import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import { useConfig } from "@/lib/queries";
import { PageHeader } from "@/components/common/PageHeader";
import { ApiKeyForm } from "@/components/common/ApiKeyForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const { data: config } = useConfig();
  const hasKey = !!config?.has_key;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Welcome to Skill Factory"
        description="Author production-ready SKILL.md files for any domain. Two quick steps to begin."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </span>
            <KeyRound className="h-4 w-4" /> Connect OpenRouter
            {hasKey && <CheckCircle2 className="ml-auto h-5 w-5 text-success" />}
          </CardTitle>
          <CardDescription>Paste your key and press “Test key” to confirm the connection.</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyForm />
        </CardContent>
      </Card>

      <Card className={hasKey ? "" : "opacity-60"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </span>
            <Sparkles className="h-4 w-4" /> Create your first skill
          </CardTitle>
          <CardDescription>
            The wizard guides you from a spec to an outline to a validated SKILL.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild disabled={!hasKey}>
            <Link to="/new">
              Start the wizard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
