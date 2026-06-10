/**
 * host-bridge.ts — abstração sobre o runtime do host (Wails desktop ou Capacitor Android).
 *
 * Expõe uma interface única para as partes do frontend que só existem quando o
 * dispositivo está HOSPEDANDO uma sala (não quando o usuário é guest no browser).
 *
 * Detecção de runtime:
 *   - Wails desktop  → window.go existe
 *   - Capacitor nativo (Android) → Capacitor.isNativePlatform() === true
 *   - Browser guest  → nenhum dos dois → hostBridge.isHost() retorna false
 */

import { Capacitor } from "@capacitor/core";

export type ServerStatus = {
  /** true quando StartServer já foi chamado (mobile) */
  running?: boolean;
  /** true quando o tunnel Cloudflare está ativo */
  active: boolean;
  public_url: string;
  local_ip: string;
};

type HostBridge = {
  isHost: () => boolean;
  startTunnel: () => Promise<void>;
  stopTunnel: () => Promise<void>;
  getServerStatus: () => Promise<ServerStatus>;
};

// ── Detecção de runtime ────────────────────────────────────────────────────

function isWailsRuntime(): boolean {
  return typeof window !== "undefined" && "go" in window;
}

function isCapacitorRuntime(): boolean {
  return Capacitor.isNativePlatform();
}

// ── Implementação Wails ────────────────────────────────────────────────────

const wailsBridge: HostBridge = {
  isHost: () => true,

  async startTunnel() {
    const { StartTunnel } = await import(
      "../../wailsjs/go/bindings/ServerApp"
    );
    await StartTunnel();
  },

  async stopTunnel() {
    const { StopTunnel } = await import(
      "../../wailsjs/go/bindings/ServerApp"
    );
    await StopTunnel();
  },

  async getServerStatus(): Promise<ServerStatus> {
    const { GetServerStatus } = await import(
      "../../wailsjs/go/bindings/ServerApp"
    );
    const s = await GetServerStatus();
    return {
      active: s.active,
      public_url: s.public_url,
      local_ip: s.local_ip,
    };
  },
};

// ── Implementação Capacitor ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nativePlugin = (): any => (Capacitor as any).Plugins?.MobilePlugin;

const capacitorBridge: HostBridge = {
  isHost: () => true,

  async startTunnel() {
    const result = await nativePlugin().startTunnel();
    return result;
  },

  async stopTunnel() {
    await nativePlugin().stopTunnel();
  },

  async getServerStatus(): Promise<ServerStatus> {
    const raw = await nativePlugin().getServerStatus();
    // MobilePlugin.getServerStatus resolves with a JSObject parsed from JSON
    return raw as ServerStatus;
  },
};

// ── Bridge nulo (browser guest) ────────────────────────────────────────────

const nullBridge: HostBridge = {
  isHost: () => false,
  startTunnel: async () => {},
  stopTunnel: async () => {},
  getServerStatus: async () => ({ active: false, public_url: "", local_ip: "" }),
};

// ── Exportação ─────────────────────────────────────────────────────────────

function resolveBridge(): HostBridge {
  if (isWailsRuntime()) return wailsBridge;
  if (isCapacitorRuntime()) return capacitorBridge;
  return nullBridge;
}

export const hostBridge = resolveBridge();
