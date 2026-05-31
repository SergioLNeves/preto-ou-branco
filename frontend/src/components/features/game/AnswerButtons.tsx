import type { Choice } from "@/types/game";

interface AnswerButtonsProps {
  disabled: boolean;
  onAnswer: (choice: Choice) => void;
}

export function AnswerButtons({ disabled, onAnswer }: AnswerButtonsProps) {
  return (
    <div className="flex gap-3 w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer("preto")}
        className="flex-1 py-5 text-[13px] font-black tracking-[0.3em] uppercase border-2 cursor-pointer bg-[#0a0a0a] text-[#f5f5f5] border-[#0a0a0a] shadow-[3px_3px_0_rgba(245,245,245,0.15)] hover:shadow-[5px_5px_0_rgba(245,245,245,0.2)] hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all"
      >
        ⬛ Preto
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer("branco")}
        className="flex-1 py-5 text-[13px] font-black tracking-[0.3em] uppercase border-2 cursor-pointer bg-[#f5f5f5] text-[#0a0a0a] border-[#f5f5f5] shadow-[3px_3px_0_rgba(10,10,10,0.15)] hover:shadow-[5px_5px_0_rgba(10,10,10,0.2)] hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all"
      >
        ⬜ Branco
      </button>
    </div>
  );
}
