import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryProvider } from "@/providers/query-client";
import { NotFoundScreen } from "@/components/features/game/NotFoundScreen";
import { Toaster } from "@/components/shared/ui/sonner";
import { YinYangLoader } from "@/components/features/game/YinYangLoader";
import { useServerReady } from "@/hooks/use-server-ready";

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFoundScreen,
});

function Root() {
  const serverReady = useServerReady();

  return (
    <QueryProvider>
      {serverReady ? <Outlet /> : <YinYangLoader message="Iniciando servidor..." />}
      <Toaster position="bottom-center" />
    </QueryProvider>
  );
}
