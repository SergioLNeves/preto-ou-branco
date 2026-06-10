import { queryOptions } from "@tanstack/react-query";
import { isWails } from "@/lib/server-url";
import type { User } from "@/types/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const meQueryOptions = queryOptions({
  queryKey: authKeys.me,
  queryFn: async (): Promise<User | null> => {
    // In browser guest mode, Wails bindings don't exist — always guest
    if (!isWails()) return null;
    const token = localStorage.getItem("auth_token");
    if (!token) return null;
    try {
      const { GetMe } = await import("../../../wailsjs/go/bindings/AuthApp");
      const user = await GetMe(token);
      return user as User;
    } catch {
      localStorage.removeItem("auth_token");
      return null;
    }
  },
  staleTime: 5 * 60 * 1000,
  retry: false,
});
