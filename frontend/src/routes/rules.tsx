import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/rules")({
  component: RulesRoute,
});

function RulesRoute() {
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans bg-[#0a0a0a]">
      <div className="flex h-full items-center justify-center text-white">
        <p>RulesPanel (em breve)</p>
      </div>
    </div>
  );
}
