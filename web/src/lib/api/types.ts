// TypeScript mirrors of api/schemas.py. Kept in sync by hand; `npm run gen:types`
// can regenerate a full openapi.d.ts from the running server's /openapi.json.

export interface SpecIn {
  name: string;
  description?: string;
  skill_type?: string;
  domain_focus?: string;
  tags?: string[];
  entities?: string[];
  requirements?: string[];
  base_skill?: string | null;
  token_budget?: number;
  tone?: string;
  reference_text?: string;
}

export interface TestResult {
  test_name: string;
  user_prompt: string;
  output: string;
  model: string;
  rating: string; // "up" | "down" | ""
  notes: string;
  created_at: number;
}

export interface SkillMeta {
  name: string;
  description: string;
  skill_type: string;
  domain_focus: string;
  tags: string[];
  entities: string[];
  base_skill: string | null;
  version: number;
  version_notes: string;
  model: string;
  created_at: number;
  test_results: TestResult[];
}

export interface SkillDetail {
  slug: string;
  content: string;
  meta: SkillMeta;
  versions: number[];
}

export interface AppConfig {
  has_key: boolean;
  default_model: string;
  app_title: string;
  skills_dir: string;
  pdf_available: boolean;
  skill_count: number;
}

export interface ValidationReport {
  ok: boolean;
  summary: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  frontmatter: Record<string, unknown>;
  estimated_tokens: number;
  line_count: number;
}

export interface SaveVersionResult {
  slug: string;
  version: number;
}

export interface ReferenceFile {
  name: string;
  chars: number;
  error: string | null;
}

export interface ReferencesResult {
  combined: string;
  files: ReferenceFile[];
}

export interface PresetEntity {
  name: string;
  ticker: string;
  notes: string;
}

export interface Preset {
  stem: string;
  name: string;
  description: string;
  entities: PresetEntity[];
  labels: string[];
}

// SSE event payloads
export interface TokenEvent {
  text: string;
}
export interface DoneEvent {
  content: string;
  model: string;
}
export interface BatchItemEvent {
  index: number;
  entity: string;
  slug: string;
  version?: number | null;
  status: "running" | "ok" | "saved (with warnings)" | "failed";
  issues?: string;
}
