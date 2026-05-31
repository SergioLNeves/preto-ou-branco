import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryProvider } from "@/providers/query-client";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <QueryProvider>
      <Outlet />
    </QueryProvider>
  );
}
