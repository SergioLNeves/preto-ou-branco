import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useRoom } from "@/hooks/use-room";
import { useSubmitRoomVote } from "@/infra/room/mutations";
import { roomResultsQueryOptions } from "@/infra/room/queries";
import { RoomLobby } from "@/components/features/room/RoomLobby";
import { WaitingForOthers } from "@/components/features/room/WaitingForOthers";
import { RoomResults } from "@/components/features/room/RoomResults";
import { QuestionCard } from "@/components/features/game/QuestionCard";
import { EngulfTransition } from "@/components/features/game/EngulfTransition";
import type { Choice } from "@/types/game";

export const Route = createFileRoute("/sala/$roomId")({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const { data: state, isLoading, error } = useRoom(roomId);
  const submitVote = useSubmitRoomVote(roomId);

  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleAnswer = useCallback(
    (choice: Choice) => {
      if (!state) return;
      const currentQuestion = state.questions[state.my_voted_count];
      if (!currentQuestion) return;
      setPendingChoice(choice);
      setAnimating(true);
      setTimeout(async () => {
        try {
          await submitVote.mutateAsync({ roomQuestionId: currentQuestion.id, choice });
        } finally {
          setAnimating(false);
        }
      }, 750);
    },
    [state, submitVote],
  );

  if (isLoading) {
    return (
      <div className="game-root fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-[rgba(245,245,245,0.6)] font-sans text-xs tracking-[0.3em] uppercase">
        Carregando...
      </div>
    );
  }

  if (error || !state) {
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

  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
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
              disabled={animating || submitVote.isPending}
              onAnswer={handleAnswer}
            />
            <EngulfTransition choice={pendingChoice} animating={animating} />
          </div>
        );
      })()}

      {state.phase === "finished" && <FinishedPhase roomId={roomId} />}
    </div>
  );
}

function FinishedPhase({ roomId }: { roomId: string }) {
  const { data: results, isLoading } = useQuery(roomResultsQueryOptions(roomId));
  if (isLoading || !results) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] text-[rgba(245,245,245,0.6)] text-xs tracking-[0.3em] uppercase">
        Calculando resultados...
      </div>
    );
  }
  return <RoomResults results={results} />;
}
