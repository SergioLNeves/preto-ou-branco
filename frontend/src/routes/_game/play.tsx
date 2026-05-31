import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_game/play")({
  component: PlayRoute,
});

function PlayRoute() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white">
      <p>Play (em breve)</p>
    </div>
  );
}
