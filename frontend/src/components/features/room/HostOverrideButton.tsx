import { useState, useEffect } from "react";
import { useForceReveal } from "@/infra/room/mutations";
import type { RoomState } from "@/types/room";

interface Props {
  state: RoomState;
}

export function HostOverrideButton({ state }: Props) {
  const forceReveal = useForceReveal(state.room_id);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!state.host_override_unlock_at) return;
    const unlockAt = new Date(state.host_override_unlock_at).getTime();
    const tick = () => {
      const diff = Math.ceil((unlockAt - Date.now()) / 1000);
      if (diff <= 0) {
        setUnlocked(true);
        setSecondsLeft(0);
      } else {
        setSecondsLeft(diff);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.host_override_unlock_at]);

  return (
    <button
      type="button"
      disabled={!unlocked || forceReveal.isPending}
      onClick={() => forceReveal.mutate()}
      className="px-6 py-3 text-xs font-extrabold tracking-[0.2em] uppercase border border-[rgba(245,245,245,0.3)] text-[rgba(245,245,245,0.6)] hover:border-[rgba(245,245,245,0.7)] hover:text-[#f5f5f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      {unlocked ? "Forçar Avanço →" : `Forçar Avanço (${secondsLeft}s)`}
    </button>
  );
}
