import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/infra/auth/queries";
import { useLogout } from "@/infra/auth/mutations";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_main/user")({
  component: UserRoute,
});

const AVATARS = [
  "🐶","🐱","🦊","🐻","🐼","🐨","🦁","🐯",
  "🦄","🐸","🐙","🦋","🐢","🦖","🐳","🦈",
  "🦉","🦚","🐧","🦅","🍉","🌵","⚡","🌙",
  "🔥","💎","👾","🎮","🏆","🎯","🚀","🌈",
];

function UserRoute() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useQuery(meQueryOptions);
  const logout = useLogout();
  const [selected, setSelected] = useState<string>(() => localStorage.getItem("user_avatar") ?? "🐶");

  useEffect(() => {
    if (!isLoading && !user) void navigate({ to: "/entrar" });
  }, [user, isLoading, navigate]);

  function handleSelect(emoji: string) {
    setSelected(emoji);
    localStorage.setItem("user_avatar", emoji);
  }

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/" }) });
  }

  if (!user) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-[#0a0a0a] text-[#f5f5f5]">
      <Link
        to="/dashboard"
        className="absolute top-6 left-6 text-xs tracking-[0.3em] uppercase opacity-60 hover:opacity-90 transition-opacity"
      >
        ← Voltar
      </Link>

      {/* Avatar atual */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-28 h-28 rounded-full bg-[rgba(245,245,245,0.08)] border-[3px] border-[rgba(245,245,245,0.25)] flex items-center justify-center text-[56px]">
          {selected}
        </div>
        <p className="text-[clamp(18px,2.5vw,28px)] font-black tracking-[-0.02em] uppercase">
          {user.username}
        </p>
        <p className="text-xs tracking-[0.3em] uppercase text-[rgba(245,245,245,0.6)]">
          Escolha seu avatar
        </p>
      </div>

      {/* Grade de avatares */}
      <div className="grid grid-cols-8 gap-3 max-w-[380px]">
        {AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Avatar ${emoji}`}
            aria-pressed={selected === emoji}
            onClick={() => handleSelect(emoji)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-[20px] border-2 transition-all cursor-pointer
              ${selected === emoji
                ? "border-[#f5f5f5] bg-[rgba(245,245,245,0.15)] scale-110"
                : "border-transparent bg-[rgba(245,245,245,0.05)] hover:bg-[rgba(245,245,245,0.1)] hover:scale-105"
              }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={logout.isPending}
        className="mt-4 px-8 py-3 text-xs font-extrabold tracking-[0.25em] uppercase border border-[rgba(245,245,245,0.2)] text-[rgba(245,245,245,0.6)] hover:border-[rgba(245,245,245,0.7)] hover:text-[rgba(245,245,245,0.9)] transition-colors cursor-pointer disabled:opacity-30"
      >
        {logout.isPending ? "Saindo..." : "Sair da conta"}
      </button>
    </div>
  );
}
