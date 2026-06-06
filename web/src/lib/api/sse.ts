import { fetchEventSource } from "@microsoft/fetch-event-source";
import { ApiError, apiUrl, authHeaders } from "./client";
import type { DoneEvent } from "./types";

// Thrown internally to stop fetchEventSource from auto-reconnecting once we've
// seen a terminal event (the server closes after `done`/`error`).
class StreamStop extends Error {}

export interface StreamHandlers {
  onEvent: (event: string, data: any) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/** Drive an SSE endpoint, dispatching every event; `done`/`error` are terminal. */
export async function streamEvents(
  path: string,
  body: unknown,
  handlers: StreamHandlers,
): Promise<void> {
  try {
    await fetchEventSource(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
      signal: handlers.signal,
      openWhenHidden: true,
      async onopen(res) {
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("text/event-stream")) {
          let detail = res.statusText;
          try {
            const d = await res.json();
            if (d?.detail) detail = d.detail;
          } catch {
            /* non-JSON error body */
          }
          throw new ApiError(detail, res.status);
        }
      },
      onmessage(ev) {
        const data = ev.data ? JSON.parse(ev.data) : {};
        handlers.onEvent(ev.event || "message", data);
        if (ev.event === "done" || ev.event === "error") throw new StreamStop();
      },
      onerror(err) {
        throw err; // disable built-in retry; handled in the outer catch
      },
    });
  } catch (err) {
    if (err instanceof StreamStop) return;
    if (handlers.signal?.aborted) return; // user-initiated stop is silent
    handlers.onError?.(err instanceof Error ? err.message : String(err));
  }
}

export interface GenerationCallbacks {
  onToken?: (text: string) => void;
  onDone?: (payload: DoneEvent) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/** Convenience wrapper for token/done/error generation streams. */
export function streamGeneration(
  path: string,
  body: unknown,
  cb: GenerationCallbacks,
): Promise<void> {
  return streamEvents(path, body, {
    signal: cb.signal,
    onError: cb.onError,
    onEvent: (event, data) => {
      if (event === "token") cb.onToken?.(data.text);
      else if (event === "done") cb.onDone?.(data as DoneEvent);
      else if (event === "error") cb.onError?.(data.message);
    },
  });
}
