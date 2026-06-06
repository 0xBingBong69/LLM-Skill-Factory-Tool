import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api/endpoints";

export { api };

export const qk = {
  config: ["config"] as const,
  models: ["models"] as const,
  skills: ["skills"] as const,
  skill: (slug: string, version?: number) => ["skill", slug, version ?? "latest"] as const,
  versions: (slug: string) => ["versions", slug] as const,
  presets: ["presets"] as const,
  preset: (stem: string) => ["preset", stem] as const,
};

export function useConfig() {
  return useQuery({ queryKey: qk.config, queryFn: api.config });
}

export function useModels() {
  return useQuery({ queryKey: qk.models, queryFn: api.models, staleTime: 5 * 60_000 });
}

export function useSkills() {
  return useQuery({ queryKey: qk.skills, queryFn: api.skills });
}

export function useSkill(slug?: string, version?: number) {
  return useQuery({
    queryKey: qk.skill(slug ?? "", version),
    queryFn: () => api.skill(slug as string, version),
    enabled: !!slug,
  });
}

export function usePresets() {
  return useQuery({ queryKey: qk.presets, queryFn: api.presets });
}

/** Invalidate everything affected by creating/updating a skill version. */
export function useInvalidateSkill() {
  const qc = useQueryClient();
  return (slug: string) => {
    qc.invalidateQueries({ queryKey: qk.skills });
    qc.invalidateQueries({ queryKey: ["skill", slug] });
    qc.invalidateQueries({ queryKey: qk.versions(slug) });
    qc.invalidateQueries({ queryKey: qk.config });
  };
}
