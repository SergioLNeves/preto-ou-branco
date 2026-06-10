import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { meQueryOptions } from "@/infra/auth/queries";
import { useStartRoom, useUpdateRoomSettings, useCloseRoom } from "@/infra/room/mutations";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { GetServerStatus, StopTunnel } from "../../../../wailsjs/go/bindings/ServerApp";
import { isWails } from "@/lib/server-url";
import type { RoomState } from "@/types/room";

interface Props {
  state: RoomState;
}

export function RoomLobby({ state }: Props) {
  const navigate = useNavigate();
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
    if (isWails()) await StopTunnel().catch(() => {});
    void navigate({ to: "/dashboard" });
  }
  const count = state.participants.length;
  const [copied, setCopied] = useState(false);

  const { data: serverStatus } = useQuery({
    queryKey: ["server-status"],
    queryFn: GetServerStatus,
    enabled: isWails(),
  });

  const shareLink =
    isWails() && serverStatus?.active && serverStatus.public_url
      ? `${serverStatus.public_url}/#/sala/${state.room_id}`
      : null;

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
            <button
              type="button"
              onClick={handleCopy}
              title="Copiar link"
              className="flex items-center gap-2 px-4 py-2 border border-[rgba(245,245,245,0.2)] hover:border-[rgba(245,245,245,0.5)] transition-colors cursor-pointer max-w-full"
            >
              <span className="text-xs font-black tracking-[0.05em] break-all text-left">
                {shareLink}
              </span>
              <span className="text-xs opacity-50 shrink-0">{copied ? "✓" : "⎘"}</span>
            </button>
            <span className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.6)]">
              clique para copiar
            </span>
          </>
        ) : (
          <span className="text-xs tracking-[0.3em] uppercase text-[rgba(245,245,245,0.4)]">
            Compartilhe o link da sala com os jogadores
          </span>
        )}
      </div>

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
