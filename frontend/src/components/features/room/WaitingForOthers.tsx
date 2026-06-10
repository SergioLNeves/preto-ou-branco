import { ParticipantAvatar } from "./ParticipantAvatar";
import type { RoomState } from "@/types/room";

interface Props {
  state: RoomState;
}

export function WaitingForOthers({ state }: Props) {
  const finished = state.participants.filter((p) => p.has_finished);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-2">
        <span className="text-[clamp(16px,2.5vw,22px)] font-black tracking-[-0.02em] text-[#f5f5f5]">
          Você terminou!
        </span>
        <span className="text-xs tracking-[0.3em] uppercase text-[rgba(245,245,245,0.4)] animate-pulse">
          Aguardando os outros...
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs tracking-[0.2em] uppercase text-[rgba(245,245,245,0.5)]">
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
    </div>
  );
}
