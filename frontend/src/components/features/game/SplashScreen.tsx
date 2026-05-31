import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/shared/ui/button";

export function SplashScreen() {
  const navigate = useNavigate();

  function handleJogar() {
    void navigate({ to: "/play" });
  }

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* scan line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(136,136,136,0.6)] to-transparent animate-[scan_4s_ease-in-out_infinite] pointer-events-none z-10" />

      {/* Black half */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] text-[#f5f5f5]">
        <p className="text-[clamp(11px,1.1vw,14px)] tracking-[0.3em] uppercase opacity-50 mb-8">
          É coisa de
        </p>
        <h1 className="text-[clamp(52px,7vw,96px)] font-black leading-[0.9] tracking-[-0.04em] uppercase select-none">
          Preto
        </h1>
      </div>

      {/* Divider */}
      <div className="w-px flex-shrink-0 bg-gradient-to-b from-transparent via-[#888] to-transparent relative z-10" />

      {/* White half */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f5f5] text-[#0a0a0a]">
        <h1 className="text-[clamp(52px,7vw,96px)] font-black leading-[0.9] tracking-[-0.04em] uppercase select-none">
          Branco?
        </h1>
        <p className="text-[clamp(11px,1.1vw,14px)] tracking-[0.3em] uppercase opacity-50 mt-8">
          ou de
        </p>
      </div>

      {/* Center OU badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-[13px] font-extrabold tracking-[0.1em] uppercase bg-[#888] text-[#f5f5f5] border-[3px] border-[#f5f5f5] shadow-[0_0_0_3px_#0a0a0a]">
          OU
        </div>
      </div>

      {/* Nav buttons */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 z-20">
        <Button variant="game-outline" size="lg" asChild className="px-8 text-[12px]">
          <Link to="/rules">Regras</Link>
        </Button>
        <Button variant="game-cta" size="lg" onClick={handleJogar} className="px-14 text-[14px]">
          Jogar →
        </Button>
      </div>
    </div>
  );
}
