// Mirrors of skill_factory.models constants used to drive the UI.

export const SKILL_TYPES = ["domain-expert", "specialist", "workflow", "hybrid"] as const;

export const SKILL_TYPE_HELP: Record<string, string> = {
  "domain-expert":
    "Broad expertise in a field (e.g. 'backend-api-engineer', 'financial-statement-analyst').",
  specialist:
    "Deep focus on a single subject/entity, usually extending a base skill (e.g. 'qnb-analyst').",
  workflow: "A repeatable procedure or checklist the model should follow step by step.",
  hybrid: "A mix of domain knowledge and a concrete workflow.",
};

export const TONES = ["concise", "balanced", "comprehensive"] as const;

export const DOCS_URL = "https://openrouter.ai/docs";
export const KEYS_URL = "https://openrouter.ai/keys";
