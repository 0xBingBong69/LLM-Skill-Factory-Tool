import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Play, Save, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { api, useConfig, useInvalidateSkill, useSkill } from "@/lib/queries";
import { streamGeneration } from "@/lib/api/sse";
import { bodyOf, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ModelSelect } from "@/components/common/ModelSelect";
import { StreamingOutput } from "@/components/common/StreamingOutput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

export default function PlaygroundPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: config } = useConfig();
  const invalidate = useInvalidateSkill();

  const versionParam = searchParams.get("version");
  const version = versionParam ? Number(versionParam) : undefined;
  const detail = useSkill(slug, version);

  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [last, setLast] = useState<{ prompt: string; output: string; model: string } | null>(null);
  const [testName, setTestName] = useState("ad-hoc test");
  const [notes, setNotes] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setModel(config?.default_model ?? "");
  }, [config?.default_model]);

  if (detail.isLoading) return <Skeleton className="h-[60vh] w-full rounded-xl" />;
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        title="Skill not found"
        description={`No skill named “${slug}”.`}
        action={
          <Button asChild>
            <Link to="/library">Back to Library</Link>
          </Button>
        }
      />
    );
  }

  const { content, meta, versions } = detail.data;
  const systemPrompt = bodyOf(content);

  async function run() {
    setOutput("");
    setLast(null);
    setRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    await streamGeneration(
      "/playground/run",
      { content, user_prompt: prompt, model: model || undefined },
      {
        signal: ctrl.signal,
        onToken: (t) => {
          acc += t;
          setOutput(acc);
        },
        onDone: (d) => setLast({ prompt, output: d.content, model: d.model }),
        onError: (m) => toast.error(m),
      },
    );
    setRunning(false);
  }

  async function record(rating: string) {
    if (!last) return;
    try {
      const res = await api.recordTest(slug, meta.version, {
        user_prompt: last.prompt,
        output: last.output,
        model: last.model,
        test_name: testName,
        rating,
        notes,
      });
      invalidate(slug);
      toast.success(`Recorded (${res.count} total for v${meta.version}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record test.");
    }
  }

  return (
    <div>
      <PageHeader
        title={`Test · ${slug}`}
        description="Run the skill as a system prompt and rate the result."
        actions={
          <Select
            value={String(meta.version)}
            onValueChange={(v) => setSearchParams({ version: v })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  v{v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="space-y-4">
        <div>
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showPrompt}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showPrompt ? "rotate-180" : ""}`} />
            System prompt (skill body sent to the model)
          </button>
          {showPrompt && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs">
              {systemPrompt}
            </pre>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Model</Label>
            <ModelSelect value={model} onChange={setModel} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Test prompt (the user turn)</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px]"
            placeholder="e.g. Review this API design for idempotency issues: …"
          />
        </div>

        <div className="flex gap-2">
          {running ? (
            <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
              <Square /> Stop
            </Button>
          ) : (
            <Button onClick={run} disabled={!prompt.trim()}>
              <Play /> Run
            </Button>
          )}
        </div>

        <StreamingOutput text={output} streaming={running} />

        {last && !running && (
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="text-sm font-semibold">Record this run against v{meta.version}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tname">Test name</Label>
                <Input id="tname" value={testName} onChange={(e) => setTestName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tnotes">Notes (optional)</Label>
                <Input id="tnotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => record("up")}>
                <ThumbsUp /> Save as good
              </Button>
              <Button variant="secondary" onClick={() => record("down")}>
                <ThumbsDown /> Save as poor
              </Button>
              <Button variant="ghost" onClick={() => record("")}>
                <Save /> Save (no rating)
              </Button>
            </div>
          </div>
        )}

        {meta.test_results.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">History ({meta.test_results.length})</h2>
            <ul className="divide-y rounded-md border text-sm">
              {meta.test_results
                .slice()
                .reverse()
                .map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="truncate">
                      {t.rating === "up" ? "👍" : t.rating === "down" ? "👎" : "•"} {t.test_name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.model} · {formatDate(t.created_at)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
