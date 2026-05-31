import { Link } from "@tanstack/react-router";

export function NotFoundScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-[#f5f5f5] font-sans">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(136,136,136,0.6)] to-transparent animate-[scan_4s_ease-in-out_infinite] pointer-events-none z-10" />

      <span className="text-[10px] font-extrabold tracking-[0.4em] uppercase opacity-40 mb-8">
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

      <Link
        to="/home"
        className="px-14 py-[18px] text-[13px] font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] border-[3px] border-[#f5f5f5] shadow-[4px_4px_0_rgba(245,245,245,0.2)] hover:-translate-y-0.5 transition-transform"
      >
        Voltar ao início →
      </Link>
    </div>
  );
}
