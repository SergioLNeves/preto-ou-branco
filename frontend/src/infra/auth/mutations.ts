import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Login, CreateAccount, Logout } from "../../../wailsjs/go/bindings/AuthApp";
import { authKeys } from "./queries";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const result = await Login(username, password);
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
      const result = await CreateAccount(username, password);
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
      if (token) await Logout(token).catch(() => {});
      localStorage.removeItem("auth_token");
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
