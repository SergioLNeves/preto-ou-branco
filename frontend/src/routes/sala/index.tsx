import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { meQueryOptions } from "@/infra/auth/queries";
import { useJoinRoom } from "@/infra/room/mutations";
import { Input } from "@/components/shared/ui/input";

const searchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/sala/")({
  validateSearch: searchSchema,
  component: SalaIndexRoute,
});

function SalaIndexRoute() {
  const navigate = useNavigate();
  const { code: codeParam } = Route.useSearch();
  const { data: user } = useQuery(meQueryOptions);
  const joinRoom = useJoinRoom();

  const [code, setCode] = useState(codeParam?.toUpperCase() ?? "");
  const [username, setUsername] = useState(user?.username ?? "");

  useEffect(() => {
    if (codeParam) setCode(codeParam.toUpperCase());
  }, [codeParam]);

  function handleJoin() {
    joinRoom.mutate({ code: code.trim().toUpperCase(), username: username.trim() }, {
      onSuccess: (state) => void navigate({ to: "/sala/$roomId", params: { roomId: state.room_id } }),
    });
  }

  const joinErrorMsg = joinRoom.error?.message?.includes("already started")
    ? "Esta partida já começou. Apenas quem já estava na sala pode reconectar."
    : joinRoom.error?.message;

  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#f5f5f5] text-[#0a0a0a]">
      <div className="w-full h-full flex flex-col items-center justify-center px-8 gap-5">
        <div className="flex flex-col items-center gap-1 mb-2">
          <h1 className="text-[clamp(28px,4vw,48px)] font-black tracking-[-0.04em] uppercase leading-none">
            Preto ou Branco
          </h1>
          <span className="text-xs tracking-[0.3em] uppercase opacity-60">Entre na sala</span>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[220px]">
          {!codeParam && (
            <Input
              type="text"
              placeholder="Código (ex: ABC123)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
              className="bg-transparent border-[rgba(10,10,10,0.3)] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.3)] focus-visible:border-[#0a0a0a] focus-visible:ring-[rgba(10,10,10,0.15)] rounded-none h-11 font-black tracking-[0.2em] uppercase text-center text-sm"
            />
          )}
          {!user && (
            <Input
              type="text"
              placeholder="Seu nome"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              autoFocus={!!codeParam}
              className="bg-transparent border-[rgba(10,10,10,0.3)] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.3)] focus-visible:border-[#0a0a0a] focus-visible:ring-[rgba(10,10,10,0.15)] rounded-none h-11 text-sm"
            />
          )}
          {joinRoom.error && (
            <p className="text-xs tracking-[0.15em] uppercase text-[rgba(10,10,10,0.6)]">{joinErrorMsg}</p>
          )}
          <button
            type="button"
            onClick={handleJoin}
            disabled={joinRoom.isPending || !code || (!user && !username)}
            className="py-3 text-xs font-extrabold tracking-[0.25em] uppercase bg-[#0a0a0a] text-[#f5f5f5] disabled:opacity-40 hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            {joinRoom.isPending ? "Entrando..." : "Entrar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
