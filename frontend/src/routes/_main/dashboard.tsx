import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { meQueryOptions } from "@/infra/auth/queries";
import { useCreateRoom } from "@/infra/room/mutations";
import { hostBridge, type ServerStatus } from "@/lib/host-bridge";

export const Route = createFileRoute("/_main/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: user } = useQuery(meQueryOptions);

  const { data: serverStatus } = useQuery<ServerStatus>({
    queryKey: ["server-status"],
    queryFn: hostBridge.getServerStatus,
    enabled: hostBridge.isHost(),
    refetchInterval: hostBridge.isHost() ? 10_000 : false,
  });

  const createRoom = useCreateRoom();
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Preparando servidor...");
  const [serverError, setServerError] = useState("");

  // Wails-only: listen for tunnel progress events emitted by the Go backend
  useEffect(() => {
    if (typeof window === "undefined" || !("go" in window)) return;
    let off: (() => void) | undefined;
    void (async () => {
      const { EventsOn, EventsOff } = await import("../../../wailsjs/runtime/runtime");
      EventsOn("tunnel:progress", (msg: unknown) => {
        if (typeof msg === "string") setLoadingMsg(msg);
      });
      off = () => EventsOff("tunnel:progress");
    })();
    return () => off?.();
  }, []);

  function handleSolo() {
    if (user) void navigate({ to: "/rules" });
    else void navigate({ to: "/entrar" });
  }

  async function handleMultiplayer() {
    if (!serverStatus?.active) {
      setServerError("");
      setLoadingMsg("Preparando servidor...");
      setLoading(true);
      try {
        await hostBridge.startTunnel();
        qc.invalidateQueries({ queryKey: ["server-status"] });
      } catch (e) {
        if (typeof e === "string") setServerError(e);
        else if (e instanceof Error) setServerError(e.message);
        else if (e && typeof e === "object" && "message" in e)
          setServerError(String((e as { message: unknown }).message));
        else setServerError(JSON.stringify(e));
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    createRoom.mutate(10, {
      onSuccess: (state) => void navigate({ to: "/sala/$roomId", params: { roomId: state.room_id } }),
      onError: (e) => setServerError(e.message),
    });
  }

  return (
    <div className="absolute inset-0 z-20 flex">
      {/* Left — Solo */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
        <button
          type="button"
          onClick={handleSolo}
          className="px-12 py-5 text-sm font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] border-[3px] border-[#f5f5f5] shadow-[4px_4px_0_rgba(245,245,245,0.15)] hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          Soloplayer →
        </button>
      </div>

      {/* Center badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
        {user ? (
          <Link
            to="/user"
            title={`Perfil (${user.username})`}
            className="w-24 h-24 rounded-full flex items-center justify-center text-[22px] font-black uppercase bg-[#888] text-[#f5f5f5] border-[4px] border-[#f5f5f5] shadow-[0_0_0_4px_#0a0a0a] hover:bg-[#666] transition-colors"
          >
            {user.username[0].toUpperCase()}
          </Link>
        ) : (
          <Link
            to="/entrar"
            className="w-24 h-24 rounded-full flex items-center justify-center text-xs font-extrabold tracking-[0.05em] uppercase bg-[#888] text-[#f5f5f5] border-[4px] border-[#f5f5f5] shadow-[0_0_0_4px_#0a0a0a] hover:bg-[#666] transition-colors"
          >
            Login
          </Link>
        )}
      </div>

      {/* Right — Multiplayer */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[#f5f5f5]">
        {loading || createRoom.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-[rgba(10,10,10,0.5)] animate-pulse">
              {createRoom.isPending ? "Criando sala..." : loadingMsg}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleMultiplayer()}
            className="px-12 py-5 text-sm font-extrabold tracking-[0.25em] uppercase text-center bg-[#0a0a0a] text-[#f5f5f5] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_rgba(10,10,10,0.2)] hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            Multiplayer →
          </button>
        )}

        {serverStatus?.active && !loading && !createRoom.isPending && (
          <span className="flex items-center gap-1.5 text-xs tracking-[0.25em] uppercase text-[rgba(10,10,10,0.6)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            Servidor ativo
          </span>
        )}

        {serverError && (
          <p className="text-xs tracking-[0.1em] text-[rgba(10,10,10,0.6)] max-w-[180px] text-center normal-case leading-relaxed">
            {serverError}
          </p>
        )}
      </div>

      {/* Bottom links */}
      <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-12">
        <Link
          to="/"
          className="text-xs tracking-[0.3em] uppercase text-[#f5f5f5] opacity-60 hover:opacity-90 transition-opacity"
        >
          ← Início
        </Link>
        <Link
          to="/settings"
          className="text-xs tracking-[0.3em] uppercase text-[#0a0a0a] opacity-60 hover:opacity-90 transition-opacity"
        >
          Config
        </Link>
      </div>
    </div>
  );
}
