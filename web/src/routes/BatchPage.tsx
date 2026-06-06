import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Factory, Loader2, Square } from "lucide-react";
import { api, useInvalidateSkill, usePresets, useSkill, useSkills } from "@/lib/queries";
import { streamEvents } from "@/lib/api/sse";
import { parseList } from "@/lib/utils";
import { TONES } from "@/lib/constants";
import type { BatchItemEvent } from "@/lib/api/types";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { FieldHelp } from "@/components/common/FieldHelp";
import { ModelSelect } from "@/components/common/ModelSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

type Row = { entity: string; slug: string; status: string; version?: number | null; issues?: string };

function statusVariant(status: string): "secondary" | "success" | "warning" | "destructive" {
  if (status === "ok") return "success";
  if (status === "failed") return "destructive";
  if (status.includes("warning")) return "warning";
  return "secondary";
}

export default function BatchPage() {
  const { data: skills } = useSkills();
  const { data: presets } = usePresets();
  const invalidate = useInvalidateSkill();

  const [baseSlug, setBaseSlug] = useState("");
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const baseDetail = useSkill(baseSlug || undefined, baseVersion ?? undefined);

  const [presetChoice, setPresetChoice] = useState("");
  const [entitiesText, setEntitiesText] = useState("");
  const [pattern, setPattern] = useState("{slug}-specialist");
  const [tone, setTone] = useState("balanced");
  const [budget, setBudget] = useState(1000);
  const [tagsText, setTagsText] = useState("");
  const [reqsText, setReqsText] = useState("");
  const [model, setModel] = useState("");

  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!baseSlug && skills && skills.length > 0) setBaseSlug(skills[0].name);
  }, [skills, baseSlug]);

  const versions = baseDetail.data?.versions ?? [];
  const entities = parseList(entitiesText);

  async function loadPreset() {
    if (!presetChoice) return;
    try {
      const preset = await api.preset(presetChoice);
      setEntitiesText(preset.labels.join("\n"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load preset.");
    }
  }

  async function generate() {
    if (entities.length === 0) return;
    setRunning(true);
    setRows(entities.map((e) => ({ entity: e, slug: "", status: "queued" })));
    setTotal(entities.length);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    await streamEvents(
      "/batch/overlay",
      {
        base_slug: baseSlug,
        base_version: baseVersion ?? undefined,
        entities,
        name_pattern: pattern,
        tone,
        token_budget: budget,
        tags: parseList(tagsText),
        requirements: reqsText.split("\n").map((r) => r.trim()).filter(Boolean),
        model: model || undefined,
      },
      {
        signal: ctrl.signal,
        onEvent: (event, data) => {
          if (event === "item") {
            const item = data as BatchItemEvent;
            setRows((prev) => {
              const next = [...prev];
              next[item.index] = {
                entity: item.entity,
                slug: item.slug,
                status: item.status,
                version: item.version,
                issues: item.issues,
              };
              return next;
            });
          } else if (event === "error") {
            toast.error(data.message ?? "Batch failed.");
          }
        },
        onError: (m) => toast.error(m),
      },
    );
    setRunning(false);
    invalidate(baseSlug);
  }

  if (skills && skills.length === 0) {
    return (
      <div>
        <PageHeader title="Batch generate" />
        <EmptyState
          icon={<Factory className="h-6 w-6" />}
          title="Create a base skill first"
          description="Batch generates one specialist overlay per entity, extending a base skill."
          action={
            <Button asChild>
              <Link to="/new">Create a skill</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const doneCount = rows.filter((r) => r.status !== "queued" && r.status !== "running").length;
  const progress = total ? (doneCount / total) * 100 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Batch generate"
        description="Produce many specialist overlays from one base skill."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Base skill</Label>
          <Select value={baseSlug} onValueChange={(v) => { setBaseSlug(v); setBaseVersion(null); }}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a base skill" />
            </SelectTrigger>
            <SelectContent>
              {(skills ?? []).map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Version</Label>
          <Select
            value={baseVersion ? String(baseVersion) : versions.length ? String(versions[versions.length - 1]) : ""}
            onValueChange={(v) => setBaseVersion(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="latest" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v} value={String(v)}>
                  v{v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-2">
          <Label>Load entities from preset</Label>
          <Select value={presetChoice} onValueChange={setPresetChoice}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="(optional)" />
            </SelectTrigger>
            <SelectContent>
              {(presets ?? []).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={loadPreset} disabled={!presetChoice}>
          Load
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entities">Entities (one per line)</Label>
        <Textarea
          id="entities"
          value={entitiesText}
          onChange={(e) => setEntitiesText(e.target.value)}
          className="min-h-[140px]"
          placeholder={"Stripe\nPlaid\nAdyen"}
        />
      </div>

      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="pattern">Name pattern</Label>
            <FieldHelp>
              Use <code>{"{slug}"}</code> as the placeholder for each entity's slug, e.g.{" "}
              <code>{"{slug}-specialist"}</code>.
            </FieldHelp>
          </div>
          <Input id="pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} />
          {entities[0] && (
            <p className="text-xs text-muted-foreground">
              First skill:{" "}
              <code className="rounded bg-muted px-1">
                {pattern.replace("{slug}", entities[0].toLowerCase().replace(/[^a-z0-9]+/g, "-"))}
              </code>
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Target body size: {budget} tokens</Label>
          <input
            id="budget"
            type="range"
            min={300}
            max={3000}
            step={100}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="btags">Tags (comma-separated)</Label>
          <Input id="btags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="breqs">Shared requirements (one per line)</Label>
          <Textarea id="breqs" value={reqsText} onChange={(e) => setReqsText(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <ModelSelect value={model} onChange={setModel} />
      </div>

      <div className="flex gap-2">
        {running ? (
          <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
            <Square /> Stop
          </Button>
        ) : (
          <Button onClick={generate} disabled={entities.length === 0}>
            <Factory /> Generate {entities.length} overlay{entities.length === 1 ? "" : "s"}
          </Button>
        )}
      </div>

      {(running || rows.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {doneCount}/{total}
            </span>
          </div>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Skill</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t" aria-live="polite">
                    <td className="px-3 py-2">{r.entity}</td>
                    <td className="px-3 py-2">
                      {r.version ? (
                        <Link to={`/skills/${r.slug}`} className="text-primary hover:underline">
                          {r.slug} v{r.version}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{r.slug || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === "running" ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> running
                        </span>
                      ) : r.status === "queued" ? (
                        <span className="text-muted-foreground">queued</span>
                      ) : (
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.issues ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
