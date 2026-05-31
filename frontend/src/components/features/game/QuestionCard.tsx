import { Link } from "@tanstack/react-router";
import type { Choice, Question } from "@/types/game";
import { AnswerButtons } from "./AnswerButtons";

interface QuestionCardProps {
  question: Question;
  currentIndex: number;
  total: number;
  disabled: boolean;
  onAnswer: (choice: Choice) => void;
}

export function QuestionCard({ question, currentIndex, total, disabled, onAnswer }: QuestionCardProps) {
  const progress = (currentIndex / total) * 100;

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-[72px] z-30 flex overflow-hidden">
        <div className="flex-1 bg-[#0a0a0a] flex items-center px-12 gap-6">
          <Link
            to="/home"
            className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase text-[rgba(245,245,245,0.4)] hover:text-[rgba(245,245,245,0.9)] transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Início
          </Link>
          <div className="w-32 h-0.5 bg-[rgba(128,128,128,0.3)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[rgba(245,245,245,0.6)] transition-[width_0.4s_ease]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex-1 bg-[#f5f5f5] flex items-center justify-end px-12">
          <span className="text-[11px] font-black tracking-[0.15em] opacity-50 text-[#0a0a0a]">
            {currentIndex + 1} / {total}
          </span>
        </div>
      </div>

      {/* Sides */}
      <div className="flex w-full h-full">
        <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] relative">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[clamp(10px,1vw,12px)] font-black tracking-[0.4em] uppercase opacity-20 text-[#f5f5f5] [writing-mode:vertical-rl]">
            Preto
          </span>
        </div>
        <div className="w-px flex-shrink-0 bg-gradient-to-b from-transparent via-[#888] to-transparent relative z-10" />
        <div className="flex-1 flex items-center justify-center bg-[#f5f5f5] relative">
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[clamp(10px,1vw,12px)] font-black tracking-[0.4em] uppercase opacity-20 text-[#0a0a0a] [writing-mode:vertical-rl] rotate-180">
            Branco
          </span>
        </div>
      </div>

      {/* Center card */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className="w-[clamp(320px,36vw,520px)] bg-[rgba(128,128,128,0.08)] border border-[rgba(128,128,128,0.25)] backdrop-blur-xl p-12 pb-10 flex flex-col items-center gap-6 text-center">
          <p
            className="text-[clamp(18px,2.2vw,28px)] font-black leading-[1.2] tracking-[-0.02em]"
            style={{
              background: "linear-gradient(to right, #f5f5f5 50%, #0a0a0a 50%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {question.text}
          </p>
          <span className="text-[11px] tracking-[0.3em] uppercase text-[#888] opacity-70">
            É coisa de...
          </span>
          <AnswerButtons disabled={disabled} onAnswer={onAnswer} />
        </div>
      </div>
    </>
  );
}
