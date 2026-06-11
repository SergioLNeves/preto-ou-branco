import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "react-qr-code";
import { QrCode } from "lucide-react";
import { meQueryOptions } from "@/infra/auth/queries";
import { useStartRoom, useUpdateRoomSettings, useCloseRoom } from "@/infra/room/mutations";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { hostBridge, type ServerStatus } from "@/lib/host-bridge";
import type { RoomState } from "@/types/room";

interface Props {
  state: RoomState;
}

export function RoomLobby({ state }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery(meQueryOptions);
  const startRoom = useStartRoom(state.room_id);
  const updateSettings = useUpdateRoomSettings(state.room_id);
  const closeRoom = useCloseRoom(state.room_id);
  const isHost = state.my_participant?.is_host;

  async function handleBack() {
    try {
      await closeRoom.mutateAsync();
    } catch {
      // sala pode já ter sido removida, continua
    }
    if (hostBridge.isHost()) await hostBridge.stopTunnel().catch(() => {});
    void navigate({ to: "/dashboard" });
  }
  const count = state.participants.length;
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [tunnelLoading, setTunnelLoading] = useState(false);
  const [tunnelError, setTunnelError] = useState<string | null>(null);

  const { data: serverStatus } = useQuery<ServerStatus>({
    queryKey: ["server-status"],
    queryFn: hostBridge.getServerStatus,
    enabled: hostBridge.isHost(),
  });

  const shareBase =
    serverStatus?.active && serverStatus.public_url
      ? serverStatus.public_url
      : serverStatus?.local_ip
        ? `http://${serverStatus.local_ip}:8080`
        : null;

  const shareLink = shareBase ? `${shareBase}/#/sala/${state.room_id}` : null;

  const isOnline = !!(serverStatus?.active && serverStatus.public_url);

  async function handleGoOnline() {
    setTunnelLoading(true);
    setTunnelError(null);
    try {
      await hostBridge.startTunnel();
      await queryClient.invalidateQueries({ queryKey: ["server-status"] });
    } catch (err) {
      setTunnelError(err instanceof Error ? err.message : "Falha ao conectar com o Cloudflare");
    } finally {
      setTunnelLoading(false);
    }
  }

  const avatarSize: "sm" | "md" | "lg" =
    count <= 4 ? "lg" : count <= 9 ? "md" : "sm";

  async function handleCopy() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-10 px-8 text-[#f5f5f5]">

      {/* Back button — host only */}
      {isHost && (
        <button
          type="button"
          onClick={() => void handleBack()}
          disabled={closeRoom.isPending}
          className="absolute top-5 left-6 text-xs font-extrabold tracking-[0.25em] uppercase text-[rgba(245,245,245,0.5)] hover:text-[rgba(245,245,245,0.9)] disabled:opacity-40 transition-colors cursor-pointer"
        >
          ← Voltar
        </button>
      )}

      {/* Share link or code */}
      <div className="flex flex-col items-center gap-2 w-full">
        {shareLink ? (
          <>
            <span className="text-xs tracking-[0.4em] uppercase text-[rgba(245,245,245,0.6)]">
              Link para compartilhar
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                title="Copiar link"
                className="flex items-center gap-2 px-4 py-2 border border-[rgba(245,245,245,0.2)] hover:border-[rgba(245,245,245,0.5)] transition-colors cursor-pointer max-w-[280px]"
              >
                <span className="text-xs font-black tracking-[0.05em] truncate text-left">
                  {shareLink}
                </span>
                <span className="text-xs opacity-50 shrink-0">{copied ? "✓" : "⎘"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQR(true)}
                title="Ver QR code"
                className="shrink-0 p-2 border border-[rgba(245,245,245,0.2)] hover:border-[rgba(245,245,245,0.5)] transition-colors cursor-pointer"
              >
                <QrCode size={16} className="text-[rgba(245,245,245,0.7)]" />
              </button>
            </div>
            <span className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.6)]">
              clique para copiar
            </span>
          </>
        ) : (
          <span className="text-xs tracking-[0.3em] uppercase text-[rgba(245,245,245,0.4)]">
            Compartilhe o link da sala com os jogadores
          </span>
        )}

        {isHost && hostBridge.isHost() && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <span className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.5)]">
              {isOnline ? "🌐 Online (Cloudflare)" : "📡 Local (Wi-Fi)"}
            </span>
            {!isOnline && (
              <button
                type="button"
                onClick={() => void handleGoOnline()}
                disabled={tunnelLoading}
                className="px-4 py-2 text-xs font-extrabold tracking-[0.2em] uppercase border border-[rgba(245,245,245,0.3)] hover:border-[rgba(245,245,245,0.6)] disabled:opacity-40 transition-colors cursor-pointer"
              >
                {tunnelLoading ? "Conectando..." : "Ficar online (Cloudflare)"}
              </button>
            )}
            {tunnelError && (
              <span className="text-xs tracking-[0.1em] text-[rgba(245,245,245,0.5)] text-center max-w-[260px] normal-case">
                {tunnelError}
              </span>
            )}
          </div>
        )}
      </div>

      {/* QR modal */}
      {showQR && shareLink && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.85)]"
          onClick={() => setShowQR(false)}
        >
          <div
            className="flex flex-col items-center gap-4 bg-[#0a0a0a] border border-[rgba(245,245,245,0.15)] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs tracking-[0.4em] uppercase text-[rgba(245,245,245,0.6)]">
              Escanear para entrar
            </span>
            <div className="p-3 bg-[#f5f5f5]">
              <QRCode value={shareLink} size={200} bgColor="#f5f5f5" fgColor="#0a0a0a" />
            </div>
            <button
              type="button"
              onClick={() => setShowQR(false)}
              className="text-xs tracking-[0.25em] uppercase text-[rgba(245,245,245,0.5)] hover:text-[rgba(245,245,245,0.9)] transition-colors cursor-pointer"
            >
              ✕ Fechar
            </button>
          </div>
        </div>
      )}


      {/* Settings */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs tracking-[0.4em] uppercase text-[rgba(245,245,245,0.4)]">Configurações</span>
        {isHost ? (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.5)]">Perguntas</span>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={updateSettings.isPending}
                  onClick={() => updateSettings.mutate(n)}
                  className={`w-12 py-2 text-sm font-extrabold tracking-[0.1em] border-2 transition-colors cursor-pointer disabled:opacity-40 ${
                    state.question_count === n
                      ? "border-[#f5f5f5] bg-[#f5f5f5] text-[#0a0a0a]"
                      : "border-[rgba(245,245,245,0.25)] text-[rgba(245,245,245,0.5)] hover:border-[rgba(245,245,245,0.6)] hover:text-[rgba(245,245,245,0.8)]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2 border border-[rgba(245,245,245,0.12)]">
            <span className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.6)]">Perguntas</span>
            <span className="text-sm font-black text-[#f5f5f5]">{state.question_count}</span>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="flex flex-wrap gap-5 justify-center max-w-[480px]">
        {state.participants.map((p) => (
          <ParticipantAvatar key={p.id} participant={p} size={avatarSize} />
        ))}
      </div>

      {/* Action */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        {isHost ? (
          <button
            type="button"
            disabled={startRoom.isPending || state.participants.length < 1}
            onClick={() => startRoom.mutate()}
            className="w-full py-4 text-sm font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_rgba(245,245,245,0.15)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-transform cursor-pointer"
          >
            {startRoom.isPending ? "Iniciando..." : "Iniciar Jogo →"}
          </button>
        ) : (
          <p className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.6)] text-center">
            Aguardando o host iniciar...
          </p>
        )}
        {!user && (
          <p className="text-xs tracking-[0.15em] uppercase text-[rgba(245,245,245,0.6)] text-center">
            Você está como convidado:{" "}
            <span className="text-[rgba(245,245,245,0.5)]">{state.my_participant?.username}</span>
          </p>
        )}
      </div>
    </div>
  );
}
