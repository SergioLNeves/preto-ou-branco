import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/infra/auth/queries";

export function SplashScreen() {
  const navigate = useNavigate();
  const { data: user } = useQuery(meQueryOptions);

  function handleJogar() {
    if (user) {
      void navigate({ to: "/dashboard" });
    } else {
      void navigate({ to: "/entrar" });
    }
  }

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* scan line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(136,136,136,0.6)] to-transparent animate-[scan_4s_ease-in-out_infinite] pointer-events-none z-10" />

      {/* Black half */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] text-[#f5f5f5]">
        <h1 className="text-[clamp(52px,7vw,96px)] font-black leading-[0.9] tracking-[-0.04em] uppercase select-none">
          Preto
        </h1>
      </div>

      {/* Divider */}
      <div className="w-px flex-shrink-0 bg-gradient-to-b from-transparent via-[#888] to-transparent relative z-10" />

      {/* White half */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f5f5] text-[#0a0a0a]">
        <h1 className="text-[clamp(52px,7vw,96px)] font-black leading-[0.9] tracking-[-0.04em] uppercase select-none">
          Branco
        </h1>
      </div>

      {/* Center OU badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="w-28 h-28 rounded-full flex items-center justify-center text-[18px] font-extrabold tracking-[0.1em] uppercase bg-[#888] text-[#f5f5f5] border-[4px] border-[#f5f5f5] shadow-[0_0_0_4px_#0a0a0a]">
          OU
        </div>
      </div>

      {/* Nav button */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
        <button
          type="button"
          onClick={handleJogar}
          className="px-16 py-[18px] text-sm font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          Jogar →
        </button>
      </div>
    </div>
  );
}
