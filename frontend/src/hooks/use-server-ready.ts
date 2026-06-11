import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { hostBridge } from "@/lib/host-bridge";

const POLL_INTERVAL_MS = 300;
const TIMEOUT_MS = 30_000;

export type ServerReadyState = "ready" | "pending" | "timeout";

/**
 * Indica o estado do servidor Go.
 * No Capacitor, faz polling de getServerStatus() até running === true,
 * ou marca "timeout" se o servidor não subir dentro de TIMEOUT_MS.
 * No Wails e no browser, retorna "ready" imediatamente (server já está up ou não existe).
 */
export function useServerReady(): ServerReadyState {
  const isCapacitor = Capacitor.isNativePlatform();
  const [state, setState] = useState<ServerReadyState>(isCapacitor ? "pending" : "ready");

  useEffect(() => {
    if (!isCapacitor) return;

    let cancelled = false;
    const deadline = Date.now() + TIMEOUT_MS;

    async function poll() {
      while (!cancelled) {
        try {
          const status = await hostBridge.getServerStatus();
          if (status.running) {
            if (!cancelled) setState("ready");
            return;
          }
        } catch {
          // server ainda não subiu, ignorar e tentar de novo
        }
        if (Date.now() >= deadline) {
          if (!cancelled) setState("timeout");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [isCapacitor]);

  return state;
}
