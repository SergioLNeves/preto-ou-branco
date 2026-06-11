import { getServerBaseURL } from "./server-url";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const guestToken = localStorage.getItem("room_guest_token");
  if (guestToken) headers["X-Guest-Token"] = guestToken;
  return headers;
}

/** Echo's default error handler returns {"message": ...}; handlers that build
 *  their own JSON (e.g. room.go) return {"error": ...} — accept either shape. */
async function apiError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
  return new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getServerBaseURL()}${path}`, { headers: authHeaders() });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${getServerBaseURL()}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await apiError(res);
  return res.json();
}
