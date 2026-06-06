import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Pencil, RotateCcw, Save, Sparkles } from "lucide-react";
import { api, useConfig, useInvalidateSkill, useSkills } from "@/lib/queries";
import { useValidation } from "@/lib/useValidation";
import { streamGeneration } from "@/lib/api/sse";
import type { SpecIn } from "@/lib/api/types";
import { SKILL_TYPES, SKILL_TYPE_HELP, TONES } from "@/lib/constants";
import { parseList, slugify, tokenBadge } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Stepper } from "@/components/common/Stepper";
import { FieldHelp } from "@/components/common/FieldHelp";
import { ModelSelect } from "@/components/common/ModelSelect";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { ValidationPanel } from "@/components/editor/ValidationPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";

const STORAGE_KEY = "skf.wizard";
const STEPS = ["Specify", "Outline", "Draft"];

interface Persisted {
  step: number;
  name: string;
  description: string;
  skillType: string;
  domainFocus: string;
  tone: string;
  tokenBudget: number;
  baseSkill: string;
  tagsText: string;
  entitiesText: string;
  requirementsText: string;
  referencePaste: string;
  referenceText: string;
  outline: string;
  draft: string;
  draftModelUsed: string;
  notes: string;
}

function loadPersisted(): Partial<Persisted> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function NewSkillPage() {
  const navigate = useNavigate();
  const invalidate = useInvalidateSkill();
  const { data: config } = useConfig();
  const saved = useMemo(loadPersisted, []);

  const [step, setStep] = useState(saved.step ?? 0);
  const [name, setName] = useState(saved.name ?? "");
  const [description, setDescription] = useState(saved.description ?? "");
  const [skillType, setSkillType] = useState(saved.skillType ?? "domain-expert");
  const [domainFocus, setDomainFocus] = useState(saved.domainFocus ?? "");
  const [tone, setTone] = useState(saved.tone ?? "balanced");
  const [tokenBudget, setTokenBudget] = useState(saved.tokenBudget ?? 1500);
  const [baseSkill, setBaseSkill] = useState(saved.baseSkill ?? "");
  const [tagsText, setTagsText] = useState(saved.tagsText ?? "");
  const [entitiesText, setEntitiesText] = useState(saved.entitiesText ?? "");
  const [requirementsText, setRequirementsText] = useState(saved.requirementsText ?? "");
  const [referencePaste, setReferencePaste] = useState(saved.referencePaste ?? "");
  const [referenceText, setReferenceText] = useState(saved.referenceText ?? "");
  const [fileReports, setFileReports] = useState<{ name: string; chars: number; error: string | null }[]>([]);
  const [outline, setOutline] = useState(saved.outline ?? "");
  const [draft, setDraft] = useState(saved.draft ?? "");
  const [draftModelUsed, setDraftModelUsed] = useState(saved.draftModelUsed ?? "");
  const [notes, setNotes] = useState(saved.notes ?? "");

  const [outlineModel, setOutlineModel] = useState(config?.default_model ?? "");
  const [draftModel, setDraftModel] = useState(config?.default_model ?? "");
  const [genOutline, setGenOutline] = useState(false);
  const [genDraft, setGenDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const filesRef = useRef<File[]>([]);

  // Autosave (refresh-safe). File objects aren't serializable, but the extracted
  // referenceText is, so generation context survives a reload.
  useEffect(() => {
    const data: Persisted = {
      step, name, description, skillType, domainFocus, tone, tokenBudget, baseSkill,
      tagsText, entitiesText, requirementsText, referencePaste, referenceText,
      outline, draft, draftModelUsed, notes,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [step, name, description, skillType, domainFocus, tone, tokenBudget, baseSkill,
      tagsText, entitiesText, requirementsText, referencePaste, referenceText,
      outline, draft, draftModelUsed, notes]);

  const slug = slugify(name);

  function deriveSpec(): SpecIn {
    return {
      name: slug,
      description: description.trim(),
      skill_type: skillType,
      domain_focus: domainFocus.trim(),
      tags: parseList(tagsText),
      entities: parseList(entitiesText),
      requirements: requirementsText.split("\n").map((r) => r.trim()).filter(Boolean),
      base_skill: baseSkill || null,
      token_budget: tokenBudget,
      tone,
      reference_text: referenceText,
    };
  }

  async function extractReferences(files: File[]) {
    const form = new FormData();
    form.append("pasted", referencePaste);
    files.forEach((f) => form.append("files", f));
    try {
      const res = await api.extractReferences(form);
      setReferenceText(res.combined);
      setFileReports(res.files);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read files.");
    }
  }

  function onFilesSelected(list: FileList | null) {
    const files = list ? Array.from(list) : [];
    filesRef.current = files;
    if (files.length === 0) {
      setFileReports([]);
      setReferenceText(referencePaste);
    } else {
      void extractReferences(files);
    }
  }

  async function generateOutline() {
    setOutline("");
    setGenOutline(true);
    let acc = "";
    await streamGeneration(
      "/generate/outline",
      { spec: deriveSpec(), model: outlineModel || undefined },
      {
        onToken: (t) => {
          acc += t;
          setOutline(acc);
        },
        onDone: () => setGenOutline(false),
        onError: (m) => {
          setGenOutline(false);
          toast.error(m);
        },
      },
    );
  }

  async function generateDraft() {
    setDraft("");
    setGenDraft(true);
    let acc = "";
    await streamGeneration(
      "/generate/draft",
      { spec: deriveSpec(), outline, model: draftModel || undefined },
      {
        onToken: (t) => {
          acc += t;
          setDraft(acc);
        },
        onDone: (d) => {
          setDraft(d.content);
          setDraftModelUsed(d.model);
          setGenDraft(false);
        },
        onError: (m) => {
          setGenDraft(false);
          toast.error(m);
        },
      },
    );
  }

  async function save(open: boolean) {
    const spec = deriveSpec();
    setSaving(true);
    try {
      const res = await api.saveVersion(spec.name, {
        content: draft,
        version_notes: notes,
        model: draftModelUsed,
        spec,
      });
      invalidate(res.slug);
      toast.success(`Saved ${res.slug} v${res.version}.`);
      localStorage.removeItem(STORAGE_KEY);
      navigate(open ? `/skills/${res.slug}` : "/library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function startOver() {
    localStorage.removeItem(STORAGE_KEY);
    setStep(0);
    setName(""); setDescription(""); setSkillType("domain-expert"); setDomainFocus("");
    setTone("balanced"); setTokenBudget(1500); setBaseSkill(""); setTagsText("");
    setEntitiesText(""); setRequirementsText(""); setReferencePaste(""); setReferenceText("");
    setFileReports([]); setOutline(""); setDraft(""); setDraftModelUsed(""); setNotes("");
  }

  const { report } = useValidation(draft, { expectedName: slug, tokenBudget });

  return (
    <div>
      <PageHeader
        title="New Skill"
        description="Specify, outline, then draft a validated SKILL.md."
        actions={
          <Button variant="ghost" size="sm" onClick={startOver}>
            <RotateCcw /> Start over
          </Button>
        }
      />
      <div className="mb-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <SpecStep
          {...{
            name, setName, slug, description, setDescription, skillType, setSkillType,
            domainFocus, setDomainFocus, tone, setTone, tokenBudget, setTokenBudget,
            baseSkill, setBaseSkill, tagsText, setTagsText, entitiesText, setEntitiesText,
            requirementsText, setRequirementsText, referencePaste, setReferencePaste,
            referenceText, setReferenceText, fileReports, onFilesSelected,
            pdfAvailable: !!config?.pdf_available,
          }}
          onContinue={() => {
            if (!name.trim()) {
              toast.error("Please provide a skill name.");
              return;
            }
            setStep(1);
          }}
        />
      )}

      {step === 1 && (
        <section className="space-y-4">
          <SpecSummary spec={deriveSpec()} />
          <div className="space-y-2">
            <Label>Model</Label>
            <ModelSelect value={outlineModel} onChange={setOutlineModel} />
          </div>
          <Button onClick={generateOutline} disabled={genOutline}>
            {genOutline ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {outline ? "Regenerate outline" : "Generate outline"}
          </Button>
          <div className="space-y-2">
            <Label htmlFor="outline">Outline (edit freely before drafting)</Label>
            <Textarea
              id="outline"
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
              placeholder="The section outline will stream in here…"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={() => setStep(2)}>
              Continue to draft <ArrowRight />
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <SpecSummary spec={deriveSpec()} />
          <div className="space-y-2">
            <Label>Model</Label>
            <ModelSelect value={draftModel} onChange={setDraftModel} />
          </div>
          <Button onClick={generateDraft} disabled={genDraft}>
            {genDraft ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {draft ? "Regenerate draft" : "Generate draft"}
          </Button>

          {!draft && !genDraft ? (
            <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Generate a draft to preview, validate, and save it.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <div className="h-[460px]">
                  <MarkdownEditor value={draft} onChange={setDraft} />
                </div>
                <p className="text-xs text-muted-foreground">{tokenBadge(draft)}</p>
              </div>
              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="validation">Validation</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="max-h-[460px] overflow-auto rounded-md border p-4">
                  <MarkdownPreview content={draft} />
                </TabsContent>
                <TabsContent value="validation">
                  <ValidationPanel report={report} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Version notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial draft"
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft /> Back to outline
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => save(false)} disabled={!draft || saving}>
                <Save /> Save version
              </Button>
              <Button onClick={() => save(true)} disabled={!draft || saving}>
                <Pencil /> Save &amp; open in editor
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SpecSummary({ spec }: { spec: SpecIn }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant="outline">{spec.name || "(unnamed)"}</Badge>
      <span>type: {spec.skill_type}</span>
      <span>· tone: {spec.tone}</span>
      {spec.base_skill && <span>· extends {spec.base_skill}</span>}
      {spec.reference_text && <span>· {tokenBadge(spec.reference_text)} of references</span>}
    </div>
  );
}

interface SpecStepProps {
  name: string;
  setName: (v: string) => void;
  slug: string;
  description: string;
  setDescription: (v: string) => void;
  skillType: string;
  setSkillType: (v: string) => void;
  domainFocus: string;
  setDomainFocus: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
  tokenBudget: number;
  setTokenBudget: (v: number) => void;
  baseSkill: string;
  setBaseSkill: (v: string) => void;
  tagsText: string;
  setTagsText: (v: string) => void;
  entitiesText: string;
  setEntitiesText: (v: string) => void;
  requirementsText: string;
  setRequirementsText: (v: string) => void;
  referencePaste: string;
  setReferencePaste: (v: string) => void;
  referenceText: string;
  setReferenceText: (v: string) => void;
  fileReports: { name: string; chars: number; error: string | null }[];
  onFilesSelected: (list: FileList | null) => void;
  pdfAvailable: boolean;
  onContinue: () => void;
}

function SpecStep(props: SpecStepProps) {
  const { data: skills } = useSkills();
  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" required>
            Skill name
          </Label>
          <Input
            id="name"
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            placeholder="backend-api-engineer"
          />
          {props.slug && (
            <p className="text-xs text-muted-foreground">
              Slug: <code className="rounded bg-muted px-1">{props.slug}</code>
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="type">Type</Label>
            <FieldHelp>
              <ul className="space-y-1">
                {SKILL_TYPES.map((t) => (
                  <li key={t}>
                    <strong>{t}</strong>: {SKILL_TYPE_HELP[t]}
                  </li>
                ))}
              </ul>
            </FieldHelp>
          </div>
          <Select value={props.skillType} onValueChange={props.setSkillType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain / focus</Label>
          <Input
            id="domain"
            value={props.domainFocus}
            onChange={(e) => props.setDomainFocus(e.target.value)}
            placeholder="REST API design in Python"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Select value={props.tone} onValueChange={props.setTone}>
            <SelectTrigger id="tone">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="budget">Target body size: {props.tokenBudget} tokens</Label>
          <input
            id="budget"
            type="range"
            min={400}
            max={4000}
            step={100}
            value={props.tokenBudget}
            onChange={(e) => props.setTokenBudget(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="base">Extend base skill (optional)</Label>
          <Select value={props.baseSkill || "__none__"} onValueChange={(v) => props.setBaseSkill(v === "__none__" ? "" : v)}>
            <SelectTrigger id="base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— none —</SelectItem>
              {(skills ?? []).map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="description">Trigger description (frontmatter)</Label>
          <FieldHelp>
            State what the skill does AND when to use it (e.g. “Use when the user asks to…”).
            This drives whether the model activates the skill.
          </FieldHelp>
        </div>
        <Textarea
          id="description"
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          placeholder="Use when the user asks to design, review, or implement a REST API…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={props.tagsText}
            onChange={(e) => props.setTagsText(e.target.value)}
            placeholder="backend, api, python"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entities">Specific subjects/entities (optional)</Label>
          <Input
            id="entities"
            value={props.entitiesText}
            onChange={(e) => props.setEntitiesText(e.target.value)}
            placeholder="one per line or comma-separated"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reqs">Key requirements (one per line)</Label>
        <Textarea
          id="reqs"
          value={props.requirementsText}
          onChange={(e) => props.setRequirementsText(e.target.value)}
          placeholder={"Cover idempotency\nInclude an output template\nList common pitfalls"}
        />
      </div>

      <div className="space-y-2 rounded-lg border p-4">
        <Label>Reference material (optional)</Label>
        <p className="text-xs text-muted-foreground">Grounds the generation in facts.</p>
        <Textarea
          value={props.referencePaste}
          onChange={(e) => {
            props.setReferencePaste(e.target.value);
            if (props.fileReports.length === 0) props.setReferenceText(e.target.value);
          }}
          placeholder="Paste durable facts, standards, internal notes…"
        />
        <input
          type="file"
          multiple
          accept={props.pdfAvailable ? ".txt,.md,.markdown,.rst,.csv,.json,.pdf" : ".txt,.md,.markdown,.rst,.csv,.json"}
          onChange={(e) => props.onFilesSelected(e.target.files)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {!props.pdfAvailable && (
          <p className="text-xs text-muted-foreground">PDF extraction is unavailable on this server.</p>
        )}
        {props.fileReports.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {props.fileReports.map((f) => (
              <Badge key={f.name} variant={f.error ? "destructive" : "success"}>
                {f.name}
                {f.error ? " — failed" : ` · ${f.chars} chars`}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={props.onContinue}>
          Continue to outline <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
