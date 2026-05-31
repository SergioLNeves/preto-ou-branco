import { cn } from "@/lib/utils";
import type { Choice } from "@/types/game";

interface EngulfTransitionProps {
  choice: Choice | null;
  animating: boolean;
}

export function EngulfTransition({ choice, animating }: EngulfTransitionProps) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0 z-50 pointer-events-none opacity-0 bg-[#0a0a0a]",
          animating &&
            choice === "preto" &&
            "animate-[engulf_0.75s_cubic-bezier(0.77,0,0.175,1)_forwards]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 z-50 pointer-events-none opacity-0 bg-[#f5f5f5]",
          animating &&
            choice === "branco" &&
            "animate-[engulf_0.75s_cubic-bezier(0.77,0,0.175,1)_forwards]",
        )}
      />
    </>
  );
}
