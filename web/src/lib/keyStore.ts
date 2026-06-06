// The OpenRouter key lives in sessionStorage only (cleared when the tab closes),
// mirroring the Streamlit app's session-only handling. It is sent per-request as a
// header and never persisted server-side.

const KEY = "skf.openrouter_key";
const MODEL = "skf.default_model";

type Listener = () => void;
const listeners = new Set<Listener>();

function read(name: string): string {
  try {
    return sessionStorage.getItem(name) ?? "";
  } catch {
    return "";
  }
}

// Cached snapshot so React's useSyncExternalStore sees a stable reference.
let cached: { key: string; model: string } = { key: read(KEY), model: read(MODEL) };

function write(name: string, value: string): void {
  try {
    if (value) sessionStorage.setItem(name, value);
    else sessionStorage.removeItem(name);
  } catch {
    /* storage unavailable (private mode) — degrade to no persistence */
  }
  cached = { key: read(KEY), model: read(MODEL) };
  listeners.forEach((l) => l());
}

export const getKey = () => read(KEY);
export const getModel = () => read(MODEL);
export const setKey = (v: string) => write(KEY, v);
export const setModel = (v: string) => write(MODEL, v);

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot(): { key: string; model: string } {
  return cached;
}
