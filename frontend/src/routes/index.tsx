import { createFileRoute } from "@tanstack/react-router";
import { SplashScreen } from "@/components/features/game/SplashScreen";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <SplashScreen />
    </div>
  );
}
