import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Choice, Question } from "@/types/game";
import { useIsTouch } from "@/hooks/use-is-touch";
import { SwipeCard } from "./SwipeCard";

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  total: number;
  disabled: boolean;
  onAnswer: (choice: Choice) => void;
}

export function QuestionCard(props: QuestionCardProps) {
  const isTouch = useIsTouch();
  if (isTouch) return <SwipeCard {...props} />;
  return <QuestionCardDesktop {...props} />;
}

function QuestionCardDesktop({ question, currentIndex, total, disabled, onAnswer }: QuestionCardProps) {
  const [hovered, setHovered] = useState<Choice | null>(null);
  const [selected, setSelected] = useState<Choice | null>(null);
  const progress = (currentIndex / total) * 100;

  const active = selected ?? hovered;

  function handleSideClick(choice: Choice) {
    if (disabled) return;
    if (selected === choice) {
      onAnswer(choice);
    } else {
      setSelected(choice);
      setHovered(null);
    }
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(null);
  }

  return (
    <>
      {/* Split background — top half Branco, bottom half Preto */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[#f5f5f5]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0a0a0a]" />

      {/* Full-screen color overlays */}
      <div
        className={cn(
          "absolute inset-0 z-[5] pointer-events-none bg-[#0a0a0a] transition-opacity duration-300",
          active === "preto" ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 z-[5] pointer-events-none bg-[#f5f5f5] transition-opacity duration-300",
          active === "branco" ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-[72px] z-30 flex overflow-hidden">
        <div className="flex-1 flex items-center px-12 gap-6">
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center gap-2 text-xs font-bold tracking-[0.25em] uppercase transition-colors shrink-0",
              active === "preto"
                ? "text-[rgba(245,245,245,0.4)] hover:text-[rgba(245,245,245,0.9)]"
                : "text-[rgba(10,10,10,0.4)] hover:text-[rgba(10,10,10,0.9)]",
            )}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Início
          </Link>
          <div className="w-32 h-0.5 bg-[rgba(128,128,128,0.3)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[rgba(128,128,128,0.6)] transition-[width_0.4s_ease]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-end px-12">
          <span
            className={cn(
              "text-xs font-black tracking-[0.15em] opacity-60 transition-colors duration-300",
              active === "preto" ? "text-[#f5f5f5]" : "text-[#0a0a0a]",
            )}
          >
            {currentIndex + 1} / {total}
          </span>
        </div>
      </div>

      {/* Top clickable half — Branco */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 h-1/2 z-10",
          disabled ? "cursor-default" : "cursor-pointer",
        )}
        onMouseEnter={() => { if (!selected && !disabled) setHovered("branco"); }}
        onMouseLeave={() => setHovered(null)}
        onClick={() => handleSideClick("branco")}
      >
        <span
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(48px,7vw,96px)] font-black tracking-[-0.04em] uppercase transition-all duration-300 select-none",
            active === "branco"
              ? "text-[#0a0a0a] opacity-100"
              : active === "preto"
                ? "text-[#888] opacity-[0.35]"
                : "text-[#0a0a0a] opacity-20",
          )}
        >
          Branco
        </span>
        {selected === "branco" && (
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[clamp(11px,1.2vw,15px)] font-extrabold tracking-[0.2em] uppercase text-[#0a0a0a] opacity-50 whitespace-nowrap">
            clique para confirmar
          </span>
        )}
      </div>

      {/* Bottom clickable half — Preto */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 h-1/2 z-10",
          disabled ? "cursor-default" : "cursor-pointer",
        )}
        onMouseEnter={() => { if (!selected && !disabled) setHovered("preto"); }}
        onMouseLeave={() => setHovered(null)}
        onClick={() => handleSideClick("preto")}
      >
        <span
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(48px,7vw,96px)] font-black tracking-[-0.04em] uppercase transition-all duration-300 select-none",
            active === "preto"
              ? "text-[#f5f5f5] opacity-100"
              : active === "branco"
                ? "text-[#888] opacity-[0.35]"
                : "text-[#f5f5f5] opacity-20",
          )}
        >
          Preto
        </span>
        {selected === "preto" && (
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[clamp(11px,1.2vw,15px)] font-extrabold tracking-[0.2em] uppercase text-[#f5f5f5] opacity-50 whitespace-nowrap">
            clique para confirmar
          </span>
        )}
      </div>

      {/* Center divider */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#888] to-transparent z-[15]" />

      {/* Center card + reset */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4 pointer-events-none">
        <div
          className={cn(
            "w-[clamp(280px,42vw,520px)] border p-10 flex flex-col items-center gap-6 text-center transition-colors duration-300",
            active === "preto"
              ? "bg-[#f5f5f5] border-[rgba(245,245,245,0.3)]"
              : active === "branco"
                ? "bg-[#0a0a0a] border-[rgba(10,10,10,0.3)]"
                : "bg-[#888] border-[rgba(128,128,128,0.4)]",
          )}
        >
          {question.image_url && (
            <img
              src={question.image_url}
              alt=""
              className="w-full h-40 object-cover"
            />
          )}
          <p
            className={cn(
              "text-[clamp(16px,2vw,24px)] font-black leading-[1.25] tracking-[-0.02em] transition-colors duration-300",
              active === "preto"
                ? "text-[#0a0a0a]"
                : active === "branco"
                  ? "text-[#f5f5f5]"
                  : "text-[#f5f5f5]",
            )}
          >
            {question.text}
          </p>
          <span
            className={cn(
              "text-xs font-extrabold tracking-[0.3em] uppercase transition-colors duration-300",
              active === "preto"
                ? "text-[#0a0a0a]"
                : active === "branco"
                  ? "text-[#f5f5f5]"
                  : "text-[#f5f5f5]",
            )}
          >
            É coisa de...
          </span>
        </div>

        {/* Reset button */}
        <div className={cn("transition-all duration-200", selected ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          <button
            type="button"
            onClick={handleReset}
            title="Resetar escolha"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
