import { Link } from "@tanstack/react-router";
import { Button } from "@/components/shared/ui/button";

export function NotFoundScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-[#f5f5f5] font-sans">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(136,136,136,0.6)] to-transparent animate-[scan_4s_ease-in-out_infinite] pointer-events-none z-10" />

      <span className="text-xs font-extrabold tracking-[0.4em] uppercase opacity-60 mb-8">
        Página não encontrada
      </span>

      <p
        className="text-[clamp(120px,22vw,280px)] font-black leading-none tracking-[-0.05em] select-none"
        aria-label="404"
      >
        404
      </p>

      <p className="text-[clamp(11px,1.1vw,13px)] tracking-[0.3em] uppercase opacity-50 mt-8 mb-12">
        Esse endereço não existe
      </p>

      <Button variant="game-cta" size="lg" asChild className="px-14 text-sm">
        <Link to="/">Voltar ao início →</Link>
      </Button>
    </div>
  );
}
