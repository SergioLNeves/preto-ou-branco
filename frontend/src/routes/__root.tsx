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
  const { state: serverState, errorMessage } = useServerReady();

  return (
    <QueryProvider>
      {serverState === "ready" && <Outlet />}
      {serverState === "pending" && <YinYangLoader message="Iniciando servidor..." />}
      {serverState === "timeout" && (
        <YinYangLoader
          message={
            errorMessage
              ? `Não foi possível iniciar o servidor: ${errorMessage}`
              : "Não foi possível iniciar o servidor. Reabra o app."
          }
        />
      )}
      <Toaster position="bottom-center" />
    </QueryProvider>
  );
}
