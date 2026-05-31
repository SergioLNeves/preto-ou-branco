import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryProvider } from "@/providers/query-client";
import { NotFoundScreen } from "@/components/features/game/NotFoundScreen";
import { Toaster } from "@/components/shared/ui/sonner";

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFoundScreen,
});

function Root() {
  return (
    <QueryProvider>
      <Outlet />
      <Toaster position="bottom-center" />
    </QueryProvider>
  );
}
