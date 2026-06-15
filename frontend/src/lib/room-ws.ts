import { buildWsURL } from "./server-url";

type EventHandler = (data: unknown) => void;

/** Connection lifecycle exposed to consumers (e.g. an offline indicator). */
export type ConnectionState = "connecting" | "open" | "reconnecting" | "failed";

// Caps the exponential backoff loop for transient errors (network drops on
// LAN/tunnel). After this many attempts we give up and report "failed"
// instead of retrying forever.
const MAX_RETRIES = 8;

export class RoomWs {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private retryDelay = 1000;
  private retryCount = 0;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = "connecting";

  constructor(private roomId: string) {}

  connect() {
    if (this.stopped) return;
    this.setState(this.retryCount > 0 ? "reconnecting" : "connecting");

    const token = localStorage.getItem("auth_token");
    const guestToken = localStorage.getItem("room_guest_token");
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (guestToken) params.set("guest_token", guestToken);
    const url = buildWsURL(`/v1/rooms/${this.roomId}/ws?${params}`);

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; payload: unknown };
        this.handlers.get(msg.type)?.forEach((h) => h(msg.payload));
        this.handlers.get("*")?.forEach((h) => h(msg));
      } catch {
        // ignore malformed frames
      }
    };

    ws.onopen = () => {
      this.retryDelay = 1000;
      this.retryCount = 0;
      this.setState("open");
    };

    // onclose fires right after onerror with the close code/reason, which is
    // where we actually decide whether to retry — onerror alone carries no
    // useful information for WebSocket.
    ws.onerror = () => {};

    ws.onclose = (e) => {
      if (this.ws !== ws) return; // stale socket already replaced by disconnect()/reconnect
      this.ws = null;
      if (this.stopped) return;

      // Auth/policy close codes mean the server won't accept a retry (e.g.
      // expired session, room closed) — stop instead of looping forever.
      const isAuthOrPolicy = e.code === 1008 || (e.code >= 4000 && e.code <= 4999);
      if (isAuthOrPolicy || this.retryCount >= MAX_RETRIES) {
        this.setState("failed");
        this.handlers.get("connection_failed")?.forEach((h) => h({ code: e.code, reason: e.reason }));
        return;
      }

      this.retryCount++;
      this.setState("reconnecting");
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
        this.connect();
      }, this.retryDelay);
    };
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.handlers.get("connection_state")?.forEach((h) => h(state));
  }

  getState(): ConnectionState {
    return this.state;
  }

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  disconnect() {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    }
  }
}
