import { getKey, getModel } from "../keyStore";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Per-request auth headers. The key is read fresh so it always reflects Config. */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const key = getKey();
  const model = getModel();
  if (key) headers["X-OpenRouter-Key"] = key;
  if (model) headers["X-OpenRouter-Model"] = model;
  return headers;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return (data?.detail as string) || res.statusText || `Request failed (${res.status})`;
  } catch {
    return res.statusText || `Request failed (${res.status})`;
  }
}

export function apiUrl(path: string): string {
  return `/api${path}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: authHeaders() });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as T;
}

export async function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as T;
}

/** Multipart POST (browser sets the Content-Type boundary itself). */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new ApiError(await errorMessage(res), res.status);
  return (await res.json()) as T;
}
