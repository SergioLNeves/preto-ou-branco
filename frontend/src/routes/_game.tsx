import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_game")({
  component: GameLayout,
});

function GameLayout() {
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <Outlet />
    </div>
  );
}
