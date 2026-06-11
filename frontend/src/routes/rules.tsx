import { createFileRoute } from "@tanstack/react-router";
import { InnerBackButton } from "@/components/features/game/InnerBackButton";
import { TutorialOverlay } from "@/components/features/game/TutorialOverlay";

export const Route = createFileRoute("/rules")({
  component: RulesRoute,
});

function RulesRoute() {
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <InnerBackButton to="/dashboard" label="Início" />
      <TutorialOverlay />
    </div>
  );
}
