import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GameAuthScreen } from "@/components/features/game/GameAuthScreen";

export const Route = createFileRoute("/entrar")({
  component: EntrarRoute,
});

function EntrarRoute() {
  const navigate = useNavigate();
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <GameAuthScreen onSuccess={() => void navigate({ to: "/dashboard" })} />
    </div>
  );
}
