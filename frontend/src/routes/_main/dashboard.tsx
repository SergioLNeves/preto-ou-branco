import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/infra/auth/queries";
import { useCreateRoom } from "@/infra/room/mutations";

export const Route = createFileRoute("/_main/dashboard")({
  component: DashboardRoute,
});

function DashboardRoute() {
  const navigate = useNavigate();
  const { data: user } = useQuery(meQueryOptions);
  const createRoom = useCreateRoom();
  const avatar = (typeof window !== "undefined" && localStorage.getItem("user_avatar")) || "🐶";

  function handleRules() {
    void navigate({ to: "/rules" });
  }

  function handlePlay() {
    if (!user) {
      void navigate({ to: "/entrar" });
      return;
    }
    createRoom.mutate(10, {
      onSuccess: (state) => void navigate({ to: "/sala/$roomId", params: { roomId: state.room_id } }),
    });
  }

  return (
    <div className="absolute inset-0 z-20 flex">
      {/* Left — Regras */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-[#0a0a0a]">
        <button
          type="button"
          onClick={handleRules}
          className="px-12 py-5 text-sm font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] border-[3px] border-[#f5f5f5] shadow-[4px_4px_0_rgba(245,245,245,0.15)] hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          Regras →
        </button>
      </div>

      {/* Top center badge — avatar do usuário */}
      <div className="absolute left-1/2 top-8 -translate-x-1/2 z-30">
        {user ? (
          <Link
            to="/user"
            title={`Perfil (${user.username})`}
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl bg-[#888] border-[4px] border-[#f5f5f5] shadow-[0_0_0_4px_#0a0a0a] hover:bg-[#666] transition-colors"
          >
            {avatar}
          </Link>
        ) : (
          <Link
            to="/entrar"
            className="w-24 h-24 rounded-full flex items-center justify-center text-xs font-extrabold tracking-[0.05em] uppercase bg-[#888] text-[#f5f5f5] border-[4px] border-[#f5f5f5] shadow-[0_0_0_4px_#0a0a0a] hover:bg-[#666] transition-colors"
          >
            Login
          </Link>
        )}
      </div>

      {/* Right — Jogar */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-[#f5f5f5]">
        <button
          type="button"
          onClick={handlePlay}
          disabled={createRoom.isPending}
          className="px-12 py-5 text-sm font-extrabold tracking-[0.25em] uppercase text-center bg-[#0a0a0a] text-[#f5f5f5] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_rgba(10,10,10,0.2)] hover:-translate-y-0.5 disabled:opacity-50 transition-transform cursor-pointer"
        >
          {createRoom.isPending ? "Criando sala..." : "Jogar →"}
        </button>

        {createRoom.isError && (
          <p className="text-xs tracking-[0.1em] text-[rgba(10,10,10,0.6)] max-w-[180px] text-center normal-case leading-relaxed">
            {createRoom.error.message}
          </p>
        )}
      </div>

      {/* Bottom link */}
      <div className="absolute bottom-6 inset-x-0 flex items-center justify-center">
        <Link
          to="/"
          className="text-xs tracking-[0.3em] uppercase text-[#f5f5f5] opacity-60 hover:opacity-90 transition-opacity"
        >
          ← Início
        </Link>
      </div>
    </div>
  );
}
