import { buildWsURL } from "./server-url";

type EventHandler = (data: unknown) => void;

export class RoomWs {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private retryDelay = 1000;
  private stopped = false;

  constructor(private roomId: string) {}

  connect() {
    if (this.stopped) return;
    const token = localStorage.getItem("auth_token");
    const guestToken = localStorage.getItem("room_guest_token");
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (guestToken) params.set("guest_token", guestToken);
    const url = buildWsURL(`/v1/rooms/${this.roomId}/ws?${params}`);

    this.ws = new WebSocket(url);
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as { type: string; payload: unknown };
        this.handlers.get(msg.type)?.forEach((h) => h(msg.payload));
        this.handlers.get("*")?.forEach((h) => h(msg));
      } catch {}
    };
    this.ws.onclose = () => {
      if (!this.stopped) {
        setTimeout(() => {
          this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
          this.connect();
        }, this.retryDelay);
      }
    };
    this.ws.onopen = () => {
      this.retryDelay = 1000;
    };
  }

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  disconnect() {
    this.stopped = true;
    this.ws?.close();
    this.ws = null;
  }
}
