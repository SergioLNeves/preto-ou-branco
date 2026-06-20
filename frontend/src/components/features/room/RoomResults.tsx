import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useRestartRoom, useCloseRoom } from "@/infra/room/mutations";
import type { RoomResults, ScoreboardEntry } from "@/types/room";
import type { RoomState } from "@/types/room";

interface Props {
  results: RoomResults;
  state: RoomState;
}

export function RoomResults({ results, state }: Props) {
  const navigate = useNavigate();
  const { steps, scoreboard } = results;

  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(scoreboard.map((e) => [e.participant_id, 0])),
  );
  const [currentStep, setCurrentStep] = useState(-1);
  const [justGained, setJustGained] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"revealing" | "winner">(
    steps.length === 0 ? "winner" : "revealing",
  );
  const winnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gainedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        // Past the last step — go straight to winner.
        if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
        setPhase("winner");
        return prev;
      }
      const step = steps[next];
      const gainers = new Set<string>();
      setScores((s) => {
        const updated = { ...s };
        for (const [pid, pts] of Object.entries(step.points)) {
          if (pts > 0) {
            updated[pid] = (updated[pid] ?? 0) + pts;
            gainers.add(pid);
          }
        }
        return updated;
      });
      setJustGained(gainers);
      if (gainedTimeoutRef.current) clearTimeout(gainedTimeoutRef.current);
      gainedTimeoutRef.current = setTimeout(() => setJustGained(new Set()), 900);
      return next;
    });
  }, [steps]);

  // Show the first step immediately on mount (no click needed for step 0).
  useEffect(() => {
    if (!started.current && phase === "revealing" && steps.length > 0) {
      started.current = true;
      advance();
    }
  }, [advance, phase, steps.length]);

  // Keyboard support: Space / Enter also advances.
  useEffect(() => {
    if (phase !== "revealing") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, phase]);

  useEffect(() => {
    return () => {
      if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
      if (gainedTimeoutRef.current) clearTimeout(gainedTimeoutRef.current);
    };
  }, []);

  function skipToEnd(e: React.MouseEvent) {
    e.stopPropagation();
    if (winnerTimeoutRef.current) clearTimeout(winnerTimeoutRef.current);
    if (gainedTimeoutRef.current) clearTimeout(gainedTimeoutRef.current);
    const finalScores: Record<string, number> = Object.fromEntries(
      scoreboard.map((e) => [e.participant_id, e.points]),
    );
    setScores(finalScores);
    setCurrentStep(steps.length - 1);
    setPhase("winner");
  }

  const sorted: ScoreboardEntry[] = [...scoreboard].sort((a, b) => {
    const diff = (scores[b.participant_id] ?? 0) - (scores[a.participant_id] ?? 0);
    if (diff !== 0) return diff;
    return a.username.localeCompare(b.username);
  });

  const step = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;
  const isLastStep = currentStep === steps.length - 1;

  if (phase === "winner") {
    return (
      <WinnerScreen
        sorted={sorted}
        scores={scores}
        state={state}
        onLeave={() => void navigate({ to: "/dashboard" })}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={advance}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); } }}
      className="absolute inset-0 flex flex-col bg-[#0a0a0a] font-sans overflow-hidden cursor-pointer select-none"
    >
      {/* Skip button */}
      <div className="flex justify-end px-8 pt-6 shrink-0">
        <button
          type="button"
          onClick={skipToEnd}
          className="text-xs font-extrabold tracking-[0.25em] uppercase text-[rgba(245,245,245,0.5)] hover:text-[rgba(245,245,245,0.9)] transition-colors cursor-pointer"
        >
          Pular →
        </button>
      </div>

      {/* Step counter */}
      <div className="flex justify-center pt-2 pb-1 shrink-0">
        <span className="text-xs tracking-[0.4em] uppercase text-[rgba(245,245,245,0.4)]">
          {step ? `Pergunta ${currentStep + 1} / ${steps.length}` : "…"}
        </span>
      </div>

      {/* Question focal */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 overflow-hidden">
        {step ? (
          <>
            <p className="text-[clamp(22px,3.5vw,44px)] font-black tracking-[-0.02em] text-[#f5f5f5] text-center leading-tight max-w-[680px]">
              {step.question_text}
            </p>
            <div className="flex items-center gap-3 text-base font-bold text-[rgba(245,245,245,0.7)]">
              <span>⬛ {step.preto_count}</span>
              <span className="opacity-40">×</span>
              <span>{step.branco_count} ⬜</span>
              <span className="ml-2 text-sm font-extrabold tracking-[0.12em] uppercase text-[rgba(245,245,245,0.5)]">
                {step.outcome === "tie" ? "Empate" : step.outcome === "preto" ? "Preto vence" : "Branco vence"}
              </span>
            </div>

            {/* Participant scores */}
            <div className="w-full max-w-[480px] flex flex-col gap-2 mt-2">
              {sorted.map((entry) => {
                const pts = scores[entry.participant_id] ?? 0;
                const gaining = justGained.has(entry.participant_id);
                return (
                  <div
                    key={entry.participant_id}
                    className={`flex items-center gap-3 px-4 py-2.5 border transition-all duration-500 ${
                      gaining ? "border-[rgba(34,197,94,0.5)] bg-[rgba(34,197,94,0.05)]" : "border-[rgba(245,245,245,0.1)]"
                    }`}
                  >
                    <span className="text-xl shrink-0">{entry.emoji}</span>
                    <span className="flex-1 text-sm font-bold text-[#f5f5f5] truncate">{entry.username}</span>
                    <span
                      className={`text-[clamp(16px,2vw,22px)] font-black tabular-nums transition-all duration-300 ${
                        gaining ? "text-[#22c55e] scale-110" : "text-[rgba(245,245,245,0.8)]"
                      }`}
                      style={{ display: "inline-block" }}
                    >
                      {pts}
                    </span>
                    {gaining && (
                      <span className="text-xs font-black text-[#22c55e] ml-1 animate-[fadeUp_0.4s_ease_forwards]">
                        +{steps[currentStep]?.points[entry.participant_id] ?? 0}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <span className="text-[rgba(245,245,245,0.3)] text-sm tracking-[0.2em] uppercase">Carregando…</span>
        )}
      </div>

      {/* Tap hint */}
      <div className="pb-6 flex justify-center shrink-0">
        <span className="text-xs tracking-[0.3em] uppercase text-[rgba(245,245,245,0.25)] animate-pulse">
          {isLastStep ? "toque para ver o resultado" : "toque para continuar"}
        </span>
      </div>
    </div>
  );
}

interface RankedEntry {
  entry: ScoreboardEntry;
  rank: number;
}

function computeRanks(sorted: ScoreboardEntry[], scores: Record<string, number>): RankedEntry[] {
  const result: RankedEntry[] = [];
  let rank = 1;
  let i = 0;
  while (i < sorted.length) {
    const pts = scores[sorted[i].participant_id] ?? 0;
    let j = i;
    while (j < sorted.length && (scores[sorted[j].participant_id] ?? 0) === pts) j++;
    for (let k = i; k < j; k++) result.push({ entry: sorted[k], rank });
    rank += j - i;
    i = j;
  }
  return result;
}

interface WinnerProps {
  sorted: ScoreboardEntry[];
  scores: Record<string, number>;
  state: RoomState;
  onLeave: () => void;
}

function WinnerScreen({ sorted, scores, state, onLeave }: WinnerProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const isHost = state.my_participant?.is_host;
  const restartRoom = useRestartRoom(state.room_id);
  const closeRoom = useCloseRoom(state.room_id);

  const ranked = computeRanks(sorted, scores);
  const rank1 = ranked.filter((r) => r.rank === 1).map((r) => r.entry);
  const rank2 = ranked.filter((r) => r.rank === 2).map((r) => r.entry);
  const rank3 = ranked.filter((r) => r.rank === 3).map((r) => r.entry);
  const rest = ranked.filter((r) => r.rank > 3);

  const isTie = rank1.length > 1;
  const title = isTie ? "Empate" : "Vencedor";

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-between py-12 px-8 bg-[#0a0a0a] font-sans overflow-hidden transition-opacity duration-700 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Title */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs tracking-[0.5em] uppercase text-[rgba(245,245,245,0.4)]">Fim de jogo</span>
        <h1 className="text-[clamp(36px,6vw,72px)] font-black tracking-[-0.04em] uppercase text-[#f5f5f5] leading-none">
          {title}
        </h1>
      </div>

      {/* Podium */}
      <div className="flex flex-col items-center gap-4 w-full max-w-[560px]">
        {/* 1st place — all tied players side by side */}
        <div className="flex items-end justify-center gap-4 w-full">
          {rank1.map((entry) => (
            <PodiumSlot
              key={entry.participant_id}
              entry={entry}
              pts={scores[entry.participant_id] ?? 0}
              place={1}
              height="h-40"
              crown
            />
          ))}
        </div>
        {/* 2nd and 3rd */}
        {(rank2.length > 0 || rank3.length > 0) && (
          <div className="flex items-end justify-center gap-4 w-full">
            {rank2.map((entry) => (
              <PodiumSlot
                key={entry.participant_id}
                entry={entry}
                pts={scores[entry.participant_id] ?? 0}
                place={2}
                height="h-28"
              />
            ))}
            {rank3.map((entry) => (
              <PodiumSlot
                key={entry.participant_id}
                entry={entry}
                pts={scores[entry.participant_id] ?? 0}
                place={3}
                height="h-20"
              />
            ))}
          </div>
        )}
      </div>

      {/* Rest */}
      {rest.length > 0 && (
        <div className="w-full max-w-[400px] flex flex-col gap-1.5">
          {rest.map(({ entry, rank }) => (
            <div key={entry.participant_id} className="flex items-center gap-3 px-4 py-2 border border-[rgba(245,245,245,0.08)]">
              <span className="text-xs font-black text-[rgba(245,245,245,0.4)] w-4">{rank}</span>
              <span className="text-lg shrink-0">{entry.emoji}</span>
              <span className="flex-1 text-sm font-bold text-[rgba(245,245,245,0.8)] min-w-0 truncate">{entry.username}</span>
              <span className="text-sm font-black text-[rgba(245,245,245,0.6)] tabular-nums">
                {scores[entry.participant_id] ?? 0}
                <span className="text-xs ml-0.5 opacity-60">pts</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {isHost ? (
          <>
            <button
              type="button"
              onClick={() => restartRoom.mutate()}
              disabled={restartRoom.isPending}
              className="w-full py-3 text-xs font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] disabled:opacity-40 hover:-translate-y-0.5 transition-transform cursor-pointer"
            >
              {restartRoom.isPending ? "Reiniciando..." : "Nova rodada →"}
            </button>
            <button
              type="button"
              onClick={() => closeRoom.mutate(undefined, { onSuccess: onLeave })}
              disabled={closeRoom.isPending}
              className="w-full py-3 text-xs font-extrabold tracking-[0.25em] uppercase border border-[rgba(245,245,245,0.3)] text-[rgba(245,245,245,0.5)] hover:border-[rgba(245,245,245,0.7)] hover:text-[rgba(245,245,245,0.8)] disabled:opacity-40 transition-colors cursor-pointer"
            >
              {closeRoom.isPending ? "Encerrando..." : "Encerrar sala"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.4)] animate-pulse text-center">
              Aguardando o host...
            </p>
            <button
              type="button"
              onClick={onLeave}
              className="w-full py-3 text-xs font-extrabold tracking-[0.25em] uppercase border border-[rgba(245,245,245,0.2)] text-[rgba(245,245,245,0.4)] hover:border-[rgba(245,245,245,0.5)] hover:text-[rgba(245,245,245,0.7)] transition-colors cursor-pointer"
            >
              Sair
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface PodiumSlotProps {
  entry: ScoreboardEntry;
  pts: number;
  place: number;
  height: string;
  crown?: boolean;
}

function PodiumSlot({ entry, pts, place, height, crown }: PodiumSlotProps) {
  const isFirst = place === 1;
  return (
    <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
      {crown && <span className="text-2xl">👑</span>}
      <span className={`${isFirst ? "text-4xl" : "text-3xl"}`}>{entry.emoji}</span>
      <span className={`font-black text-center leading-tight min-w-0 w-full break-words ${isFirst ? "text-base text-[#f5f5f5]" : "text-sm text-[rgba(245,245,245,0.8)]"}`}>
        {entry.username}
      </span>
      <span className={`font-black tabular-nums ${isFirst ? "text-[clamp(22px,3vw,32px)] text-[#f5f5f5]" : "text-lg text-[rgba(245,245,245,0.7)]"}`}>
        {pts}
        <span className="text-xs ml-1 opacity-60">pts</span>
      </span>
      <div className={`w-full ${height} flex items-center justify-center border-t-2 ${isFirst ? "border-[#f5f5f5] bg-[rgba(245,245,245,0.07)]" : "border-[rgba(245,245,245,0.2)] bg-[rgba(245,245,245,0.03)]"}`}>
        <span className={`font-black ${isFirst ? "text-3xl text-[#f5f5f5]" : "text-xl text-[rgba(245,245,245,0.4)]"}`}>
          {place}º
        </span>
      </div>
    </div>
  );
}
