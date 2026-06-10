import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isWails, getServerBaseURL } from "@/lib/server-url";
import { authKeys } from "./queries";

async function httpAuthError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({})) as { message?: string };
  throw new Error(body.message ?? "erro desconhecido");
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (isWails()) {
        const { Login } = await import("../../../wailsjs/go/bindings/AuthApp");
        const result = await Login(username, password);
        localStorage.setItem("auth_token", result.token);
        return result.user;
      }
      const res = await fetch(`${getServerBaseURL()}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) await httpAuthError(res);
      const result = await res.json() as { token: string; user: unknown };
      localStorage.setItem("auth_token", result.token);
      return result.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (isWails()) {
        const { CreateAccount } = await import("../../../wailsjs/go/bindings/AuthApp");
        const result = await CreateAccount(username, password);
        localStorage.setItem("auth_token", result.token);
        return result.user;
      }
      const res = await fetch(`${getServerBaseURL()}/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) await httpAuthError(res);
      const result = await res.json() as { token: string; user: unknown };
      localStorage.setItem("auth_token", result.token);
      return result.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        if (isWails()) {
          const { Logout } = await import("../../../wailsjs/go/bindings/AuthApp");
          await Logout(token).catch(() => {});
        } else {
          await fetch(`${getServerBaseURL()}/v1/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      }
      localStorage.removeItem("auth_token");
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
