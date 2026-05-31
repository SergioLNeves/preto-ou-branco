import { Button } from "@/components/shared/ui/button";
import type { Choice } from "@/types/game";

interface AnswerButtonsProps {
  disabled: boolean;
  onAnswer: (choice: Choice) => void;
}

export function AnswerButtons({ disabled, onAnswer }: AnswerButtonsProps) {
  return (
    <div className="flex gap-3 w-full">
      <Button
        variant="game-black"
        size="lg"
        disabled={disabled}
        onClick={() => onAnswer("preto")}
        className="flex-1 py-5 text-[13px]"
      >
        ⬛ Preto
      </Button>
      <Button
        variant="game-white"
        size="lg"
        disabled={disabled}
        onClick={() => onAnswer("branco")}
        className="flex-1 py-5 text-[13px]"
      >
        ⬜ Branco
      </Button>
    </div>
  );
}
