const DEFAULT = "http://localhost:8080";
const KEY = "server_url";

/** True when running inside the Wails desktop app */
export function isWails(): boolean {
  return typeof window !== "undefined" && "go" in window;
}

export function getServerBaseURL(): string {
  // In browser (guest via tunnel), use the current origin — API is on same host
  if (!isWails()) return window.location.origin;
  // In Wails (host), always use the local backend — never route via tunnel
  return DEFAULT;
}

export function setServerBaseURL(url: string) {
  if (url && url !== DEFAULT) {
    localStorage.setItem(KEY, url.replace(/\/$/, ""));
  } else {
    localStorage.removeItem(KEY);
  }
}

export function clearServerBaseURL() {
  localStorage.removeItem(KEY);
}

/** Converts an http(s) base URL to a ws(s) WebSocket URL + path */
export function buildWsURL(path: string): string {
  const base = getServerBaseURL();
  return base.replace(/^https:/, "wss:").replace(/^http:/, "ws:") + path;
}
