import { getServerBaseURL } from "./server-url";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const guestToken = localStorage.getItem("room_guest_token");
  if (guestToken) headers["X-Guest-Token"] = guestToken;
  return headers;
}

/** Thrown by apiGet/apiPost on non-2xx responses. `status` carries the HTTP
 *  status code so callers can make reliable decisions (e.g. 404 → "sala não
 *  encontrada") instead of matching on error message text. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Echo's default error handler returns {"message": ...}; handlers that build
 *  their own JSON (e.g. room.go) return {"error": ...} — accept either shape. */
async function apiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
  return new ApiError(body.error ?? body.message ?? `HTTP ${res.status}`, res.status);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getServerBaseURL()}${path}`, { headers: authHeaders() });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${getServerBaseURL()}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as T;
  return res.json();
}
