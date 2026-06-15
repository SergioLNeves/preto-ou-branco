import { queryOptions } from "@tanstack/react-query";
import { hostBridge } from "@/lib/host-bridge";
import { isWails, getServerBaseURL } from "@/lib/server-url";
import type { User } from "@/types/auth";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const meQueryOptions = queryOptions({
  queryKey: authKeys.me,
  queryFn: async (): Promise<User | null> => {
    // Browser guests have no account
    if (!hostBridge.isHost()) return null;
    const token = localStorage.getItem("auth_token");
    if (!token) return null;
    try {
      if (isWails()) {
        const { GetMe } = await import("../../../wailsjs/go/bindings/AuthApp");
        const user = await GetMe(token);
        return user as User;
      }
      // Capacitor: use HTTP auth endpoint
      const res = await fetch(`${getServerBaseURL()}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem("auth_token");
        return null;
      }
      return (await res.json()) as User;
    } catch {
      localStorage.removeItem("auth_token");
      return null;
    }
  },
  staleTime: 5 * 60 * 1000,
  retry: false,
});
