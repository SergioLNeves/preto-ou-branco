import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { hostBridge } from "@/lib/host-bridge";

const POLL_INTERVAL_MS = 300;
const TIMEOUT_MS = 30_000;

export type ServerReadyState = "ready" | "pending" | "timeout";

export type ServerReadyResult = {
  state: ServerReadyState;
  errorMessage: string | null;
};

/**
 * Indica o estado do servidor Go.
 * No Capacitor, faz polling de getServerStatus() até running === true,
 * ou marca "timeout" se o servidor não subir dentro de TIMEOUT_MS.
 * Se o servidor reportar last_error, falha imediatamente com a mensagem real.
 * No Wails e no browser, retorna "ready" imediatamente (server já está up ou não existe).
 */
export function useServerReady(): ServerReadyResult {
  const isCapacitor = Capacitor.isNativePlatform();
  const [state, setState] = useState<ServerReadyState>(isCapacitor ? "pending" : "ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          if (status.last_error) {
            if (!cancelled) {
              setErrorMessage(status.last_error);
              setState("timeout");
            }
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

  return { state, errorMessage };
}
