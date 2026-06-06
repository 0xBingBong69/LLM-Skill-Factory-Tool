import { apiGet, apiSend, apiUpload, apiUrl } from "./client";
import type {
  AppConfig,
  Preset,
  ReferencesResult,
  SaveVersionResult,
  SkillDetail,
  SkillMeta,
  SpecIn,
  ValidationReport,
} from "./types";

export interface SaveVersionBody {
  content: string;
  version_notes?: string;
  model?: string;
  spec?: SpecIn;
  from_version?: number;
}

export interface OverwriteBody {
  content: string;
  version_notes?: string;
  model?: string;
}

export interface ValidateBody {
  content: string;
  expected_name?: string | null;
  token_budget?: number | null;
}

export interface RecordTestBody {
  user_prompt: string;
  output: string;
  model: string;
  test_name?: string;
  rating?: string;
  notes?: string;
}

const enc = encodeURIComponent;

export const api = {
  config: () => apiGet<AppConfig>("/config"),
  models: () => apiGet<{ models: string[] }>("/models"),

  skills: () => apiGet<SkillMeta[]>("/skills"),
  skill: (slug: string, version?: number) =>
    apiGet<SkillDetail>(`/skills/${enc(slug)}${version ? `?version=${version}` : ""}`),
  versions: (slug: string) => apiGet<number[]>(`/skills/${enc(slug)}/versions`),

  saveVersion: (slug: string, body: SaveVersionBody) =>
    apiSend<SaveVersionResult>("POST", `/skills/${enc(slug)}/versions`, body),
  overwriteVersion: (slug: string, version: number, body: OverwriteBody) =>
    apiSend<SaveVersionResult>("PUT", `/skills/${enc(slug)}/versions/${version}`, body),

  validate: (body: ValidateBody) => apiSend<ValidationReport>("POST", "/validate", body),
  recordTest: (slug: string, version: number, body: RecordTestBody) =>
    apiSend<{ version: number; count: number }>(
      "POST",
      `/skills/${enc(slug)}/versions/${version}/tests`,
      body,
    ),

  presets: () => apiGet<string[]>("/presets"),
  preset: (stem: string) => apiGet<Preset>(`/presets/${enc(stem)}`),

  extractReferences: (form: FormData) =>
    apiUpload<ReferencesResult>("/references/extract", form),

  slugify: (name: string) => apiGet<{ slug: string }>(`/slugify?name=${enc(name)}`),

  exportUrl: (slug: string, opts?: { version?: number; allVersions?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.version) params.set("version", String(opts.version));
    if (opts?.allVersions) params.set("all_versions", "true");
    const q = params.toString();
    return apiUrl(`/skills/${enc(slug)}/export${q ? `?${q}` : ""}`);
  },
};
