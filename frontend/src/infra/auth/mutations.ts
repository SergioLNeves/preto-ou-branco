import { useMutation, useQueryClient } from "@tanstack/react-query";
import { withWails } from "@/lib/server-url";
import { apiPost } from "@/lib/api-client";
import type { AuthResult } from "@/types/auth";
import { authKeys } from "./queries";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const result = await withWails(
        async () => {
          const { Login } = await import("../../../wailsjs/go/bindings/AuthApp");
          return Login(username, password);
        },
        () => apiPost<AuthResult>("/v1/auth/login", { username, password }),
      );
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
      const result = await withWails(
        async () => {
          const { CreateAccount } = await import("../../../wailsjs/go/bindings/AuthApp");
          return CreateAccount(username, password);
        },
        () => apiPost<AuthResult>("/v1/auth/register", { username, password }),
      );
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
        await withWails(
          async () => {
            const { Logout } = await import("../../../wailsjs/go/bindings/AuthApp");
            await Logout(token);
          },
          () => apiPost("/v1/auth/logout"),
        ).catch(() => {});
      }
      localStorage.removeItem("auth_token");
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
