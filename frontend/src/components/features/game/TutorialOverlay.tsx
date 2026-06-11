import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useIsTouch } from "@/hooks/use-is-touch";

type Highlight = "card" | "branco" | "preto" | "reset";

interface Step {
  highlight: Highlight;
  text: string;
}

const STEPS_DESKTOP: Step[] = [
  {
    highlight: "card",
    text: "Em uma sala multiplayer, todos os jogadores recebem a mesma pergunta ao mesmo tempo, no centro da tela.",
  },
  {
    highlight: "branco",
    text: "Clique na metade de cima se você acha que é coisa de branco.",
  },
  {
    highlight: "preto",
    text: "Clique na metade de baixo se você acha que é coisa de preto.",
  },
  {
    highlight: "reset",
    text: "Mudou de ideia? Use o botão vermelho para resetar. Para confirmar, clique de novo no mesmo lado. Quando todos votarem, a sala avança para a próxima pergunta.",
  },
];

const STEPS_TOUCH: Step[] = [
  {
    highlight: "card",
    text: "Em uma sala multiplayer, todos os jogadores recebem a mesma pergunta ao mesmo tempo, no centro da tela.",
  },
  {
    highlight: "branco",
    text: "Arraste o card para CIMA para votar em BRANCO.",
  },
  {
    highlight: "preto",
    text: "Arraste o card para BAIXO para votar em PRETO.",
  },
  {
    highlight: "reset",
    text: "Solte antes do limite para cancelar a escolha. Quando todos votarem, a sala avança para a próxima pergunta.",
  },
];

export function TutorialOverlay() {
  const isTouch = useIsTouch();
  const steps = isTouch ? STEPS_TOUCH : STEPS_DESKTOP;

  if (isTouch) return <TutorialTouch steps={steps} />;
  return <TutorialDesktop steps={steps} />;
}

// ─── Desktop ────────────────────────────────────────────────────────────────

function TutorialDesktop({ steps }: { steps: Step[] }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = steps[step];
  const h = current.highlight;
  const simulatedActive = h === "reset" || h === "branco" ? "branco" : h === "preto" ? "preto" : null;

  function advance() {
    if (step >= steps.length - 1) void navigate({ to: "/dashboard" });
    else setStep((s) => s + 1);
  }

  function skipToPlay(e: React.MouseEvent) {
    e.stopPropagation();
    void navigate({ to: "/dashboard" });
  }

  return (
    <div className="absolute inset-0 z-10 cursor-pointer" onClick={advance}>
      {/* Skip */}
      <button
        type="button"
        onClick={skipToPlay}
        className="absolute top-4 right-6 z-40 text-xs font-extrabold tracking-[0.25em] uppercase text-[rgba(128,128,128,0.6)] hover:text-[rgba(128,128,128,0.9)] transition-colors cursor-pointer"
      >
        Pular →
      </button>

      {/* Step indicator */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none">
        <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-[rgba(128,128,128,0.6)]">
          {step + 1} / {steps.length}
        </span>
        <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-[rgba(128,128,128,0.5)]">
          toque para continuar
        </span>
      </div>

      {/* Split background — top Branco, bottom Preto */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[#f5f5f5]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0a0a0a]" />

      {/* Color overlays */}
      <div className={cn("absolute inset-0 z-[5] pointer-events-none bg-[#0a0a0a] transition-opacity duration-300", simulatedActive === "preto" ? "opacity-100" : "opacity-0")} />
      <div className={cn("absolute inset-0 z-[5] pointer-events-none bg-[#f5f5f5] transition-opacity duration-300", simulatedActive === "branco" ? "opacity-100" : "opacity-0")} />

      {/* Top bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-[72px] z-30 pointer-events-none transition-colors duration-300", simulatedActive === "preto" ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]")} />

      {/* Top half — Branco */}
      <div className="absolute top-0 inset-x-0 h-1/2 z-10 pointer-events-none">
        <span className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(48px,7vw,96px)] font-black tracking-[-0.04em] uppercase transition-all duration-300 select-none",
          h === "branco" || h === "reset" ? "text-[#0a0a0a] opacity-100" : h === "preto" ? "text-[#0a0a0a] opacity-5" : "text-[#0a0a0a] opacity-20",
        )}>
          Branco
        </span>
        {h === "reset" && (
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[clamp(11px,1.2vw,15px)] font-extrabold tracking-[0.2em] uppercase text-[#0a0a0a] opacity-50 whitespace-nowrap pointer-events-none">
            clique para confirmar
          </span>
        )}
      </div>

      {/* Bottom half — Preto */}
      <div className="absolute bottom-0 inset-x-0 h-1/2 z-10 pointer-events-none">
        <span className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(48px,7vw,96px)] font-black tracking-[-0.04em] uppercase transition-all duration-300 select-none",
          h === "preto" ? "text-[#f5f5f5] opacity-100" : (h === "reset" || h === "branco") ? "text-[#f5f5f5] opacity-5" : "text-[#f5f5f5] opacity-20",
        )}>
          Preto
        </span>
      </div>

      {/* Center divider */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#888] to-transparent z-[15]" />

      {/* Center card + label + reset */}
      <div className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4 pointer-events-none transition-all duration-300",
        h === "card" ? "scale-105" : "scale-100",
      )}>
        <div className={cn(
          "w-[clamp(280px,42vw,520px)] border p-10 flex flex-col items-center gap-6 text-center transition-colors duration-300",
          simulatedActive === "preto" ? "bg-[#f5f5f5] border-[rgba(245,245,245,0.3)]"
            : simulatedActive === "branco" ? "bg-[#0a0a0a] border-[rgba(10,10,10,0.3)]"
            : "bg-[#888] border-[rgba(128,128,128,0.4)]",
          h !== "card" && h !== "reset" && simulatedActive === null ? "opacity-40" : "opacity-100",
        )}>
          <p className={cn(
            "text-[clamp(16px,2vw,24px)] font-black leading-[1.25] tracking-[-0.02em] transition-colors duration-300",
            simulatedActive === "preto" ? "text-[#0a0a0a]" : simulatedActive === "branco" ? "text-[#f5f5f5]" : "text-[#f5f5f5]",
          )}>
            Pizza com abacaxi
          </p>
          <span className={cn(
            "text-xs font-extrabold tracking-[0.3em] uppercase transition-colors duration-300",
            simulatedActive === "preto" ? "text-[#0a0a0a]" : simulatedActive === "branco" ? "text-[#f5f5f5]" : "text-[#f5f5f5]",
          )}>
            É coisa de...
          </span>
        </div>

        <p
          key={step}
          className="text-[clamp(16px,2vw,22px)] font-extrabold tracking-[-0.01em] text-center max-w-[clamp(260px,30vw,440px)] animate-[fadeUp_0.4s_ease_forwards] text-[#f5f5f5] bg-[rgba(10,10,10,0.75)] px-6 py-3 leading-snug"
        >
          {current.text}
        </p>

        {/* Reset button */}
        <div className={cn("transition-all duration-200", h === "reset" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            title="Resetar escolha"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600 text-white cursor-default"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Touch ───────────────────────────────────────────────────────────────────

function TutorialTouch({ steps }: { steps: Step[] }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = steps[step];
  const h = current.highlight;

  function advance() {
    if (step >= steps.length - 1) void navigate({ to: "/dashboard" });
    else setStep((s) => s + 1);
  }

  function skipToPlay(e: React.MouseEvent) {
    e.stopPropagation();
    void navigate({ to: "/dashboard" });
  }

  const swingAnim =
    h === "branco" ? "animate-[swipeHintUp_1.4s_ease-in-out_infinite]" :
    h === "preto"  ? "animate-[swipeHintDown_1.4s_ease-in-out_infinite]" : "";

  return (
    <div className="absolute inset-0 z-10 cursor-pointer bg-[#888]" onClick={advance}>
      {/* Skip */}
      <button
        type="button"
        onClick={skipToPlay}
        className="absolute top-4 right-6 z-40 text-xs font-extrabold tracking-[0.25em] uppercase text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] transition-colors cursor-pointer"
      >
        Pular →
      </button>

      {/* Step indicator */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none">
        <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-[rgba(255,255,255,0.6)]">
          {step + 1} / {steps.length}
        </span>
        <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-[rgba(255,255,255,0.5)]">
          toque para continuar
        </span>
      </div>

      {/* Branco overlay hint (step branco) */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none bg-[#f5f5f5] transition-opacity duration-500"
        style={{ opacity: h === "branco" ? 0.18 : 0 }}
      />
      {/* Preto overlay hint (step preto) */}
      <div
        className="absolute inset-0 z-[5] pointer-events-none bg-[#0a0a0a] transition-opacity duration-500"
        style={{ opacity: h === "preto" ? 0.22 : 0 }}
      />

      {/* Card */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-5 pointer-events-none">
        <div className={cn("transition-transform duration-300", swingAnim)}>
          <div className={cn(
            "w-[clamp(260px,78vw,380px)] border p-8 flex flex-col items-center gap-5 text-center transition-colors duration-300",
            h === "card" ? "scale-105 bg-[#888] border-[rgba(128,128,128,0.4)]" : "bg-[#888] border-[rgba(128,128,128,0.4)]",
          )}>
            <p className="text-[clamp(18px,5vw,26px)] font-black leading-[1.25] tracking-[-0.02em] text-[#f5f5f5]">
              Pizza com abacaxi
            </p>
            <span className="text-xs font-extrabold tracking-[0.3em] uppercase text-[#f5f5f5]">
              É coisa de...
            </span>
          </div>
        </div>

        <p
          key={step}
          className="text-[clamp(16px,4.5vw,20px)] font-extrabold tracking-[-0.01em] text-center max-w-[clamp(260px,80vw,380px)] animate-[fadeUp_0.4s_ease_forwards] text-[#f5f5f5] bg-[rgba(10,10,10,0.75)] px-6 py-3 leading-snug"
        >
          {current.text}
        </p>
      </div>
    </div>
  );
}
