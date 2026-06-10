import { getServerBaseURL } from "./server-url";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const guestToken = localStorage.getItem("room_guest_token");
  if (guestToken) headers["X-Guest-Token"] = guestToken;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getServerBaseURL()}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${getServerBaseURL()}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
