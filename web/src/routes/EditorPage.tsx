import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Download, FlaskConical, Loader2, RotateCcw, Save, Wand2 } from "lucide-react";
import { api, useInvalidateSkill, useSkill } from "@/lib/queries";
import { useValidation } from "@/lib/useValidation";
import { streamGeneration } from "@/lib/api/sse";
import { formatDate, tokenBadge } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ModelSelect } from "@/components/common/ModelSelect";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { ValidationPanel } from "@/components/editor/ValidationPanel";
import { VersionDiff } from "@/components/editor/VersionDiff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

export default function EditorPage() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const invalidate = useInvalidateSkill();

  const versionParam = searchParams.get("version");
  const version = versionParam ? Number(versionParam) : undefined;
  const detail = useSkill(slug, version);

  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [compareVersion, setCompareVersion] = useState<number | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const loadedKeyRef = useRef("");
  const undoRef = useRef<string | null>(null);

  const currentVersion = detail.data?.meta.version;
  const storageKey = currentVersion ? `skf.editor.${slug}.${currentVersion}` : "";

  // Load on slug/version change; restore an autosaved local draft if present.
  useEffect(() => {
    if (!detail.data) return;
    const key = `${slug}:${detail.data.meta.version}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    const draft = localStorage.getItem(`skf.editor.${slug}.${detail.data.meta.version}`);
    setContent(draft ?? detail.data.content);
  }, [detail.data, slug]);

  // Debounced autosave (only when diverged from the saved version).
  useEffect(() => {
    if (!detail.data || !storageKey) return;
    const id = setTimeout(() => {
      if (content === detail.data!.content) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, content);
    }, 400);
    return () => clearTimeout(id);
  }, [content, detail.data, storageKey]);

  const dirty = !!detail.data && content !== detail.data.content;
  const { report, loading: validating } = useValidation(content, { expectedName: slug });

  const compare = useSkill(slug, compareVersion ?? undefined);
  const compareContent = useMemo(
    () => (compareVersion && compare.data ? compare.data.content : ""),
    [compareVersion, compare.data],
  );

  function revert() {
    if (detail.data) setContent(detail.data.content);
    if (storageKey) localStorage.removeItem(storageKey);
  }

  async function saveNew() {
    try {
      const res = await api.saveVersion(slug, {
        content,
        version_notes: notes,
        from_version: currentVersion,
      });
      if (storageKey) localStorage.removeItem(storageKey);
      invalidate(slug);
      toast.success(`Saved as v${res.version}.`);
      loadedKeyRef.current = "";
      setSearchParams({ version: String(res.version) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function overwrite() {
    if (!currentVersion) return;
    try {
      await api.overwriteVersion(slug, currentVersion, { content, version_notes: notes });
      if (storageKey) localStorage.removeItem(storageKey);
      invalidate(slug);
      loadedKeyRef.current = "";
      await detail.refetch();
      toast.success(`Overwrote v${currentVersion}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    }
  }

  if (detail.isLoading) {
    return <Skeleton className="h-[70vh] w-full rounded-xl" />;
  }
  if (detail.isError) {
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
  if (!detail.data) return null;

  const { meta, versions } = detail.data;

  return (
    <div>
      <PageHeader
        title={slug}
        description={`v${meta.version}${dirty ? " · unsaved changes" : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(meta.version)}
              onValueChange={(v) => {
                loadedKeyRef.current = "";
                setSearchParams({ version: v });
              }}
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
            <Button asChild variant="secondary">
              <Link to={`/skills/${slug}/test`}>
                <FlaskConical /> Test
              </Link>
            </Button>
            <Button asChild variant="ghost" aria-label="Export zip">
              <a href={api.exportUrl(slug)} download>
                <Download />
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>SKILL.md</Label>
            {dirty && (
              <Button variant="ghost" size="sm" onClick={revert}>
                <RotateCcw /> Revert
              </Button>
            )}
          </div>
          <div className="h-[520px]">
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
          <p className="text-xs text-muted-foreground">{tokenBadge(content)}</p>
        </div>

        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="max-h-[520px] overflow-auto rounded-md border p-4">
            <MarkdownPreview content={content} />
          </TabsContent>
          <TabsContent value="validation">
            <ValidationPanel report={report} loading={validating} />
          </TabsContent>
          <TabsContent value="metadata">
            <MetadataPanel meta={meta} />
          </TabsContent>
          <TabsContent value="diff" className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Compare current edits to</Label>
              <Select
                value={compareVersion ? String(compareVersion) : "__none__"}
                onValueChange={(v) => setCompareVersion(v === "__none__" ? null : Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— pick —</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      v{v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {compareVersion ? (
              compare.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <VersionDiff
                  left={compareContent}
                  right={content}
                  leftLabel={`v${compareVersion}`}
                  rightLabel="current edits"
                />
              )
            ) : (
              <p className="text-sm text-muted-foreground">Pick a version to compare against your current edits.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Save bar */}
      <div className="mt-6 flex flex-wrap items-end gap-3 border-t pt-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ed-notes">Version notes</Label>
          <Input
            id="ed-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What changed?"
          />
        </div>
        <Button variant="outline" onClick={() => setRefineOpen(true)}>
          <Wand2 /> Refine with LLM
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Save /> Save <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={saveNew}>Save as new version</DropdownMenuItem>
            <DropdownMenuItem onClick={overwrite}>Overwrite v{meta.version}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <RefineDialog
        open={refineOpen}
        onOpenChange={setRefineOpen}
        content={content}
        onApply={(next) => {
          undoRef.current = content;
          setContent(next);
          toast.success("Applied refinement.", {
            action: {
              label: "Undo",
              onClick: () => undoRef.current !== null && setContent(undoRef.current),
            },
          });
        }}
      />
    </div>
  );
}

function MetadataPanel({ meta }: { meta: import("@/lib/api/types").SkillMeta }) {
  const rows: [string, string][] = [
    ["Type", meta.skill_type],
    ["Domain", meta.domain_focus || "—"],
    ["Tags", meta.tags.length ? meta.tags.join(", ") : "—"],
    ["Entities", meta.entities.length ? meta.entities.join(", ") : "—"],
    ["Base skill", meta.base_skill || "—"],
    ["Version notes", meta.version_notes || "—"],
    ["Model", meta.model || "—"],
    ["Created", formatDate(meta.created_at)],
    ["Test runs", String(meta.test_results.length)],
  ];
  return (
    <dl className="divide-y rounded-md border text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-3 py-2">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function RefineDialog({
  open,
  onOpenChange,
  content,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onApply: (next: string) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [section, setSection] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    let acc = "";
    await streamGeneration(
      "/generate/refine",
      { content, instruction, section, model: model || undefined },
      {
        onToken: (t) => {
          acc += t;
        },
        onDone: (d) => {
          setBusy(false);
          onApply(d.content);
          onOpenChange(false);
          setInstruction("");
          setSection("");
        },
        onError: (m) => {
          setBusy(false);
          toast.error(m);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refine with the LLM</DialogTitle>
          <DialogDescription>
            Describe the change. The model rewrites the whole SKILL.md, preserving what's good.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="instruction" required>
              Instruction
            </Label>
            <Textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Make the red flags section more concrete and add a checklist"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Target section (optional)</Label>
            <Input
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="Red Flags"
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <ModelSelect value={model} onChange={setModel} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} disabled={busy || !instruction.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} Refine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
