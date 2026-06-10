import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InnerBackButton } from "@/components/features/game/InnerBackButton";
import { hostBridge, type ServerStatus } from "@/lib/host-bridge";
import { clearServerBaseURL } from "@/lib/server-url";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const qc = useQueryClient();

  const { data: status } = useQuery<ServerStatus>({
    queryKey: ["server-status"],
    queryFn: hostBridge.getServerStatus,
    enabled: hostBridge.isHost(),
    refetchInterval: hostBridge.isHost() ? 5000 : false,
  });

  const stopTunnel = useMutation({
    mutationFn: async () => {
      await hostBridge.stopTunnel();
      clearServerBaseURL();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["server-status"] }),
  });

  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a] text-[#f5f5f5]">
      <InnerBackButton to="/dashboard" label="Dashboard" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 px-8">

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-xs tracking-[0.4em] uppercase text-[rgba(245,245,245,0.6)]">
            Configurações
          </span>
          <h2 className="text-[clamp(28px,4vw,42px)] font-black tracking-[-0.03em] uppercase leading-none">
            Servidor
          </h2>
        </div>

        <div className="w-full max-w-[280px] flex flex-col gap-4">
          {status?.active ? (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                  <span className="text-xs tracking-[0.3em] uppercase text-[#4ade80]">
                    Ativo
                  </span>
                </div>
                <p className="text-xs font-black break-all text-[rgba(245,245,245,0.7)] leading-relaxed">
                  {status.public_url}
                </p>
                <p className="text-xs tracking-[0.15em] uppercase text-[rgba(245,245,245,0.6)] normal-case">
                  O link aparece automaticamente no lobby da sala
                </p>
              </div>

              <button
                type="button"
                onClick={() => stopTunnel.mutate()}
                disabled={stopTunnel.isPending}
                className="w-full py-3 text-xs font-extrabold tracking-[0.25em] uppercase border border-[rgba(245,245,245,0.2)] text-[rgba(245,245,245,0.6)] hover:border-[rgba(245,245,245,0.6)] hover:text-[rgba(245,245,245,0.9)] transition-colors cursor-pointer disabled:opacity-30"
              >
                {stopTunnel.isPending ? "Parando..." : "Parar Servidor"}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[rgba(245,245,245,0.2)]" />
                <span className="text-xs tracking-[0.3em] uppercase text-[rgba(245,245,245,0.6)]">
                  Inativo
                </span>
              </div>
              <p className="text-xs tracking-[0.1em] text-[rgba(245,245,245,0.6)] normal-case leading-relaxed max-w-[220px]">
                Clique em <strong className="text-[rgba(245,245,245,0.5)]">Multiplayer</strong> no dashboard para iniciar o servidor automaticamente.
              </p>
            </div>
          )}
        </div>

        <p className="text-[8px] tracking-[0.2em] uppercase text-[rgba(245,245,245,0.12)] text-center">
          Janela mínima 1280 × 720
        </p>
      </div>
    </div>
  );
}
