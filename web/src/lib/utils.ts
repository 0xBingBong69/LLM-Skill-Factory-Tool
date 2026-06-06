import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Mirror of skill_factory.skill_store.slugify for live slug previews. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Mirror of new_skill_page._parse_list: split on newlines and commas. */
export function parseList(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    for (const piece of line.split(",")) {
      const t = piece.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/** Mirror of validator.estimate_tokens (~4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.max(0, Math.floor(text.length / 4));
}

export function tokenBadge(text: string): string {
  const tokens = estimateTokens(text).toLocaleString();
  const lines = text ? text.split("\n").length : 0;
  return `~${tokens} tokens · ${lines} lines`;
}

/** Best-effort client mirror of frontmatter.split_frontmatter (body only). */
export function bodyOf(text: string): string {
  if (text.startsWith("---")) {
    const close = text.indexOf("\n---", 3);
    if (close !== -1) {
      const nl = text.indexOf("\n", close + 1);
      return nl !== -1 ? text.slice(nl + 1).replace(/^\n+/, "") : "";
    }
  }
  return text;
}

export function formatDate(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
