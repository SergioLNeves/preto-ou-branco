import { useState, useEffect } from "react";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { HostOverrideButton } from "./HostOverrideButton";
import type { RoomState } from "@/types/room";

interface Props {
  state: RoomState;
}

export function RoomWaiting({ state }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const isHost = state.my_participant?.is_host;
  const finished = state.participants.filter((p) => p.has_finished);

  useEffect(() => {
    if (!state.waiting_deadline) return;
    const deadline = new Date(state.waiting_deadline).getTime();
    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.waiting_deadline]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs tracking-[0.4em] uppercase text-[rgba(245,245,245,0.6)]">
          Aguardando
        </span>
        {timeLeft && (
          <span className="text-[clamp(32px,5vw,56px)] font-black tabular-nums tracking-tight">
            {timeLeft}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.6)]">
          {finished.length} / {state.participants.length} terminaram
        </p>
        <div className="flex flex-wrap gap-3 justify-center max-w-[280px]">
          {state.participants.map((p) => (
            <div key={p.id} className={p.has_finished ? "opacity-100" : "opacity-30"}>
              <ParticipantAvatar participant={p} size="sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {isHost && <HostOverrideButton state={state} />}
        <p className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.6)] text-center">
          {isHost ? "Você pode forçar o avanço após 30s" : "Aguarde o host avançar"}
        </p>
      </div>
    </div>
  );
}
