import { useSyncExternalStore } from "react";
import { setKey, setModel, snapshot, subscribe } from "@/lib/keyStore";

/** Reactive access to the session-stored OpenRouter key + default model. */
export function useApiKey() {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { key: state.key, model: state.model, setKey, setModel };
}
