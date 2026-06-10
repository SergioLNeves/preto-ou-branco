import { type FormEvent, useState } from "react";
import { useLogin, useCreateAccount } from "@/infra/auth/mutations";
import { Input } from "@/components/shared/ui/input";

interface Props {
  onSuccess: () => void;
}

export function GameAuthScreen({ onSuccess }: Props) {
  const login = useLogin();
  const createAccount = useCreateAccount();

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [createUser, setCreateUser] = useState("");
  const [createPass, setCreatePass] = useState("");

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    login.mutate({ username: loginUser, password: loginPass }, { onSuccess });
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    createAccount.mutate({ username: createUser, password: createPass }, { onSuccess });
  }

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#888] to-transparent z-10 -translate-x-1/2" />

      {/* Login — dark side */}
      <div className="dark flex-1 flex items-center justify-center bg-[#0a0a0a] text-[#f5f5f5]">
        <form onSubmit={handleLogin} className="w-[min(240px,80%)] flex flex-col gap-3">
          <h2 className="text-[clamp(22px,3vw,32px)] font-black tracking-[-0.03em] uppercase mb-1">
            Entrar
          </h2>
          {login.error && (
            <p className="text-xs tracking-[0.15em] uppercase text-[rgba(245,245,245,0.6)] border border-[rgba(245,245,245,0.2)] px-3 py-2">
              {login.error.message}
            </p>
          )}
          <Input
            type="text"
            placeholder="Usuário"
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            className="bg-transparent border-[rgba(245,245,245,0.3)] text-[#f5f5f5] placeholder:text-[rgba(245,245,245,0.3)] focus-visible:border-[#f5f5f5] focus-visible:ring-[rgba(245,245,245,0.2)] rounded-none h-11 text-sm"
          />
          <Input
            type="password"
            placeholder="Senha"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
            className="bg-transparent border-[rgba(245,245,245,0.3)] text-[#f5f5f5] placeholder:text-[rgba(245,245,245,0.3)] focus-visible:border-[#f5f5f5] focus-visible:ring-[rgba(245,245,245,0.2)] rounded-none h-11 text-sm"
          />
          <button
            type="submit"
            disabled={login.isPending}
            className="py-3 text-xs font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] disabled:opacity-40 cursor-pointer hover:-translate-y-0.5 transition-transform"
          >
            {login.isPending ? "Entrando..." : "Entrar →"}
          </button>
        </form>
      </div>

      {/* Create Account — light side */}
      <div className="flex-1 flex items-center justify-center bg-[#f5f5f5] text-[#0a0a0a]">
        <form onSubmit={handleCreate} className="w-[min(240px,80%)] flex flex-col gap-3">
          <h2 className="text-[clamp(22px,3vw,32px)] font-black tracking-[-0.03em] uppercase mb-1">
            Criar conta
          </h2>
          {createAccount.error && (
            <p className="text-xs tracking-[0.15em] uppercase text-[rgba(10,10,10,0.6)] border border-[rgba(10,10,10,0.2)] px-3 py-2">
              {createAccount.error.message}
            </p>
          )}
          <Input
            type="text"
            placeholder="Usuário"
            value={createUser}
            onChange={(e) => setCreateUser(e.target.value)}
            className="bg-transparent border-[rgba(10,10,10,0.3)] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.3)] focus-visible:border-[#0a0a0a] focus-visible:ring-[rgba(10,10,10,0.15)] rounded-none h-11 text-sm"
          />
          <Input
            type="password"
            placeholder="Senha (mín. 6 chars)"
            value={createPass}
            onChange={(e) => setCreatePass(e.target.value)}
            className="bg-transparent border-[rgba(10,10,10,0.3)] text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.3)] focus-visible:border-[#0a0a0a] focus-visible:ring-[rgba(10,10,10,0.15)] rounded-none h-11 text-sm"
          />
          <button
            type="submit"
            disabled={createAccount.isPending}
            className="py-3 text-xs font-extrabold tracking-[0.25em] uppercase bg-[#0a0a0a] text-[#f5f5f5] disabled:opacity-40 cursor-pointer hover:-translate-y-0.5 transition-transform"
          >
            {createAccount.isPending ? "Criando..." : "Criar →"}
          </button>
        </form>
      </div>
    </div>
  );
}
