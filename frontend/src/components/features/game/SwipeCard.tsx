import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Choice, Question } from "@/types/game";

interface SwipeCardProps {
  question: Question;
  currentIndex: number;
  total: number;
  disabled: boolean;
  onAnswer: (choice: Choice) => void;
  onBack?: (() => void | Promise<void>) | null;
}

const THRESHOLD = () => Math.min(window.innerHeight * 0.28, 130);

export function SwipeCard({ question, currentIndex, total, disabled, onAnswer, onBack }: SwipeCardProps) {
  const [dragY, setDragY] = useState(0);
  const [phase, setPhase] = useState<"idle" | "dragging" | "exiting">("idle");
  const startYRef = useRef(0);
  const progress = (currentIndex / total) * 100;

  const t = Math.min(Math.abs(dragY) / THRESHOLD(), 1);
  const draggingDown = dragY > 30;
  const draggingUp = dragY < -30;
  const activeGuess: Choice | null = draggingDown ? "preto" : draggingUp ? "branco" : null;

  const pretoOpacity = dragY > 0 ? t : 0;
  const brancoOpacity = dragY < 0 ? t : 0;
  const hintOpacity = phase === "dragging" ? Math.max(0, 1 - t * 4) : 0.3;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || phase === "exiting") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    setPhase("dragging");
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (phase !== "dragging") return;
    setDragY(e.clientY - startYRef.current);
  }

  function commit() {
    if (phase !== "dragging") return;
    const threshold = THRESHOLD();
    if (Math.abs(dragY) >= threshold) {
      const choice: Choice = dragY > 0 ? "preto" : "branco";
      const exitY = dragY > 0 ? window.innerHeight + 300 : -(window.innerHeight + 300);
      setDragY(exitY);
      setPhase("exiting");
      setTimeout(() => {
        onAnswer(choice);
        setDragY(0);
        setPhase("idle");
      }, 300);
    } else {
      setDragY(0);
      setPhase("idle");
    }
  }

  const cardStyle: React.CSSProperties = {
    transform: `translate(-50%, calc(-50% + ${dragY}px))`,
    transition: phase === "dragging" ? "none" : "transform 260ms ease-out",
  };

  const topBarTextColor =
    activeGuess === "preto" ? "rgba(245,245,245,0.7)" : "rgba(10,10,10,0.7)";

  return (
    <div
      className="absolute inset-0 select-none touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commit}
      onPointerCancel={commit}
    >
      {/* Split background */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[#f5f5f5]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0a0a0a]" />

      {/* Preto overlay (drag down) */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none bg-[#0a0a0a]"
        style={{ opacity: pretoOpacity }}
      />
      {/* Branco overlay (drag up) */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none bg-[#f5f5f5]"
        style={{ opacity: brancoOpacity }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-[72px] z-30 flex items-center justify-between px-8 pointer-events-none">
        <div className="flex items-center gap-4">
          {onBack && (() => {
            const icon = (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10 3L5 8l5 5" />
              </svg>
            );
            const baseClass = "flex items-center gap-2 text-xs font-bold tracking-[0.25em] uppercase transition-colors shrink-0 pointer-events-auto";
            return (
              <button type="button" onClick={() => void onBack()} className={`${baseClass} cursor-pointer`} style={{ color: topBarTextColor }}>
                {icon} Início
              </button>
            );
          })()}
          <div className="w-28 h-0.5 bg-[rgba(128,128,128,0.4)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[rgba(128,128,128,0.7)] transition-[width_0.4s_ease]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span
          className="text-xs font-black tracking-[0.15em] opacity-60 transition-colors duration-300"
          style={{ color: topBarTextColor }}
        >
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Branco hint — top */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-200"
        style={{ opacity: draggingUp ? t : hintOpacity }}
      >
        <span className="text-[clamp(13px,4vw,20px)] font-black tracking-[-0.02em] uppercase text-[#0a0a0a] flex flex-col items-center gap-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Branco
        </span>
      </div>

      {/* Preto hint — bottom */}
      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-200"
        style={{ opacity: draggingDown ? t : hintOpacity }}
      >
        <span className="text-[clamp(13px,4vw,20px)] font-black tracking-[-0.02em] uppercase text-[#f5f5f5] flex flex-col items-center gap-1">
          Preto
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {/* Center divider (only visible when not dragging) */}
      <div
        className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[rgba(128,128,128,0.4)] to-transparent z-[15] pointer-events-none transition-opacity duration-200"
        style={{ opacity: phase === "idle" ? 1 : 0 }}
      />

      {/* Draggable card */}
      <div
        className="absolute left-1/2 top-1/2 z-20 pointer-events-none"
        style={cardStyle}
      >
        <div
          className={cn(
            "w-[clamp(260px,78vw,420px)] border p-8 flex flex-col items-center gap-5 text-center transition-colors duration-300",
            activeGuess === "preto"
              ? "bg-[#f5f5f5] border-[rgba(245,245,245,0.3)]"
              : activeGuess === "branco"
                ? "bg-[#0a0a0a] border-[rgba(10,10,10,0.3)]"
                : "bg-[#888] border-[rgba(128,128,128,0.4)]",
          )}
        >
          {question.image_url && (
            <img src={question.image_url} alt="" className="w-full h-36 object-cover" />
          )}
          <p
            className={cn(
              "text-[clamp(18px,5vw,26px)] font-black leading-[1.25] tracking-[-0.02em] transition-colors duration-300",
              activeGuess === "preto"
                ? "text-[#0a0a0a]"
                : activeGuess === "branco"
                  ? "text-[#f5f5f5]"
                  : "text-[#f5f5f5]",
            )}
          >
            {question.text}
          </p>
          <span
            className={cn(
              "text-xs font-extrabold tracking-[0.3em] uppercase transition-colors duration-300",
              activeGuess === "preto"
                ? "text-[#0a0a0a]"
                : activeGuess === "branco"
                  ? "text-[#f5f5f5]"
                  : "text-[#f5f5f5]",
            )}
          >
            É coisa de...
          </span>
        </div>
      </div>
    </div>
  );
}
