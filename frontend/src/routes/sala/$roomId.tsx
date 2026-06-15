import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useRoom } from "@/hooks/use-room";
import { useSubmitRoomVote, useJoinRoom, useCloseRoom } from "@/infra/room/mutations";
import { roomResultsQueryOptions, roomKeys } from "@/infra/room/queries";
import { hostBridge } from "@/lib/host-bridge";
import { ApiError } from "@/lib/api-client";
import type { ConnectionState } from "@/lib/room-ws";
import { RoomLobby } from "@/components/features/room/RoomLobby";
import { RoomResults } from "@/components/features/room/RoomResults";
import { WaitingForOthers } from "@/components/features/room/WaitingForOthers";
import { QuestionCard } from "@/components/features/game/QuestionCard";
import { Input } from "@/components/shared/ui/input";
import type { Choice } from "@/types/game";

export const Route = createFileRoute("/sala/$roomId")({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: state, isLoading, error, connectionState } = useRoom(roomId);
  const submitVote = useSubmitRoomVote(roomId);
  const joinRoom = useJoinRoom();
  const closeRoom = useCloseRoom(roomId);

  async function handleHostExit() {
    try {
      await closeRoom.mutateAsync();
    } catch {
      // sala pode já ter sido removida
    }
    if (hostBridge.isHost()) await hostBridge.stopTunnel().catch(() => {});
    void navigate({ to: "/dashboard" });
  }

  const [username, setUsername] = useState("");

  const handleAnswer = useCallback(
    async (choice: Choice) => {
      if (!state) return;
      const currentQuestion = state.questions[state.my_voted_count];
      if (!currentQuestion) return;
      try {
        await submitVote.mutateAsync({ roomQuestionId: currentQuestion.id, choice });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao registrar voto");
      }
    },
    [state, submitVote],
  );

  function handleJoin() {
    joinRoom.mutate({ roomId, username: username.trim() }, {
      onSuccess: (newState) => {
        queryClient.setQueryData(roomKeys.state(roomId), newState);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="game-root fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-[rgba(245,245,245,0.6)] font-sans text-xs tracking-[0.3em] uppercase">
        Carregando...
      </div>
    );
  }

  // Room not found (real 404)
  if (!state && error) {
    const is404 = error instanceof ApiError && error.status === 404;

    // If we can't tell it's a real 404, offer the join form
    if (!is404) {
      return (
        <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#f5f5f5] text-[#0a0a0a]">
          <div className="w-full h-full flex flex-col items-center justify-center px-8 gap-5">
            <div className="flex flex-col items-center gap-1 mb-2">
              <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-[-0.04em] uppercase leading-none">
                Preto ou Branco
              </h1>
              <span className="text-xs tracking-[0.3em] uppercase opacity-60">Entre na sala</span>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-[220px]">
              <Input
                type="text"
                placeholder="Seu nome"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && username.trim()) handleJoin(); }}
                maxLength={24}
                autoFocus
                className="bg-transparent border-[rgba(10,10,10,0.3)] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.3)] focus-visible:border-[#0a0a0a] focus-visible:ring-[rgba(10,10,10,0.15)] rounded-none h-11 text-sm"
              />
              {joinRoom.error && (
                <p className="text-xs tracking-[0.15em] uppercase text-[rgba(10,10,10,0.6)]">
                  {joinRoom.error instanceof Error ? joinRoom.error.message : "Erro ao entrar"}
                </p>
              )}
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinRoom.isPending || !username.trim()}
                className="py-3 text-xs font-extrabold tracking-[0.25em] uppercase bg-[#0a0a0a] text-[#f5f5f5] disabled:opacity-40 hover:-translate-y-0.5 transition-transform cursor-pointer"
              >
                {joinRoom.isPending ? "Entrando..." : "Entrar →"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="game-root fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-[#f5f5f5] font-sans gap-4">
        <p className="text-xs tracking-[0.3em] uppercase opacity-70">Sala não encontrada</p>
        <button
          type="button"
          onClick={() => void navigate({ to: "/sala" })}
          className="px-8 py-3 text-xs font-black tracking-[0.25em] uppercase border border-[rgba(245,245,245,0.4)] text-[rgba(245,245,245,0.6)] hover:border-[rgba(245,245,245,0.9)] transition-colors cursor-pointer"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <ConnectionBanner state={connectionState} />

      {state.phase === "lobby" && <RoomLobby state={state} />}

      {state.phase === "playing" && (() => {
        const currentQuestion = state.questions[state.my_voted_count];
        if (!currentQuestion) {
          return <WaitingForOthers state={state} />;
        }
        return (
          <div className="absolute inset-0">
            <QuestionCard
              key={currentQuestion.id}
              question={{ id: currentQuestion.id, category_id: "", text: currentQuestion.text }}
              currentIndex={state.my_voted_count}
              total={state.question_count}
              disabled={submitVote.isPending}
              onAnswer={handleAnswer}
              onBack={state.my_participant?.is_host ? handleHostExit : null}
            />
          </div>
        );
      })()}

      {state.phase === "finished" && <FinishedPhase roomId={roomId} state={state} />}
    </div>
  );
}

// Shown when the WebSocket drops the live connection — the room state still
// polls every 3s (see useRoom), but events (votes, phase changes) may lag.
function ConnectionBanner({ state }: { state: ConnectionState }) {
  if (state !== "reconnecting" && state !== "failed") return null;
  return (
    <div className="absolute top-0 inset-x-0 z-40 flex items-center justify-center py-1.5 bg-[rgba(245,245,245,0.08)] text-[rgba(245,245,245,0.7)] text-[10px] font-bold tracking-[0.25em] uppercase">
      {state === "reconnecting" ? "Reconectando…" : "Conexão em tempo real perdida — atualizando por polling"}
    </div>
  );
}

function FinishedPhase({ roomId, state }: { roomId: string; state: ReturnType<typeof useRoom>["data"] }) {
  const { data: results, isLoading } = useQuery(roomResultsQueryOptions(roomId));
  if (isLoading || !results || !state) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] text-[rgba(245,245,245,0.6)] text-xs tracking-[0.3em] uppercase">
        Calculando resultados...
      </div>
    );
  }
  return <RoomResults results={results} state={state} />;
}
