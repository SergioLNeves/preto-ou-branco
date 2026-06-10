import { Button } from "@/components/shared/ui/button";
import type { VoteResult } from "@/types/game";
import { ResultBar } from "./ResultBar";

interface ResultViewProps {
  result: VoteResult;
  isLast: boolean;
  onNext: () => void;
}

export function ResultView({ result, isLast, onNext }: ResultViewProps) {
  const dominant = result.pctPreto >= result.pctBranco ? "preto" : "branco";
  const dominantPct = dominant === "preto" ? result.pctPreto : result.pctBranco;
  const dominantLabel = dominant === "preto" ? "Preto" : "Branco";
  const textColor = dominant === "preto" ? "#f5f5f5" : "#0a0a0a";
  const btnVariant = dominant === "preto" ? "game-white" : "game-black";

  const blackFlex = result.pctPreto;
  const whiteFlex = result.pctBranco;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 flex flex-col md:flex-row">
        <div
          className="bg-[#0a0a0a] transition-[flex_1s_cubic-bezier(0.77,0,0.175,1)]"
          style={{ flex: blackFlex }}
        />
        <div
          className="bg-[#f5f5f5] transition-[flex_1s_cubic-bezier(0.77,0,0.175,1)]"
          style={{ flex: whiteFlex }}
        />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0 p-12 text-center z-10">
        <div
          className="text-[clamp(96px,14vw,180px)] font-black leading-[0.85] tracking-[-0.05em] mb-6 transition-colors duration-300"
          style={{ color: textColor }}
        >
          {dominantPct}%
        </div>

        <p
          className="text-[clamp(14px,1.5vw,20px)] font-bold tracking-[0.08em] uppercase leading-[1.4] max-w-[560px] animate-[fadeUp_0.5s_ease_forwards]"
          style={{ color: textColor }}
        >
          {dominantPct}% votaram em{" "}
          <span
            style={{
              display: "inline-block",
              padding: "2px 14px",
              border: "2px solid currentColor",
              marginLeft: "6px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              lineHeight: 1.6,
            }}
          >
            {dominantLabel}
          </span>
        </p>

        <ResultBar
          pctPreto={result.pctPreto}
          pctBranco={result.pctBranco}
          textColor={textColor}
        />

        <Button
          variant={btnVariant}
          onClick={onNext}
          className="mt-12 px-14 py-[18px] text-sm"
        >
          {isLast ? "Finalizar →" : "Próxima →"}
        </Button>
      </div>
    </div>
  );
}
