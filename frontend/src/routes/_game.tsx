import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NavDots } from "@/components/features/game/NavDots";

export const Route = createFileRoute("/_game")({
  component: GameLayout,
});

function GameLayout() {
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <Outlet />
      <NavDots />
    </div>
  );
}
