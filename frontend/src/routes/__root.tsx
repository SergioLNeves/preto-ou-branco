import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryProvider } from "@/providers/query-client";
import { NotFoundScreen } from "@/components/features/game/NotFoundScreen";

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFoundScreen,
});

function Root() {
  return (
    <QueryProvider>
      <Outlet />
    </QueryProvider>
  );
}
