import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { hostBridge } from "@/lib/host-bridge";

/**
 * Retorna true quando o servidor Go está pronto para receber requisições.
 * No Capacitor, faz polling de getServerStatus() até running === true.
 * No Wails e no browser, retorna true imediatamente (server já está up ou não existe).
 */
export function useServerReady(): boolean {
  const isCapacitor = Capacitor.isNativePlatform();
  const [ready, setReady] = useState(!isCapacitor);

  useEffect(() => {
    if (!isCapacitor) return;

    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const status = await hostBridge.getServerStatus();
          if (status.running) {
            if (!cancelled) setReady(true);
            return;
          }
        } catch {
          // server ainda não subiu, ignorar e tentar de novo
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [isCapacitor]);

  return ready;
}
