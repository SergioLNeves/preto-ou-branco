import { Capacitor } from "@capacitor/core";

const DEFAULT = "http://localhost:8080";
const KEY = "server_url";

/** True when running inside the Wails desktop app */
export function isWails(): boolean {
  return typeof window !== "undefined" && "go" in window;
}

export function getServerBaseURL(): string {
  // Wails host or Capacitor native → always local backend
  if (isWails() || Capacitor.isNativePlatform()) return DEFAULT;
  // Browser guest via tunnel → API lives on the same origin (served by Go/Echo)
  return window.location.origin;
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
