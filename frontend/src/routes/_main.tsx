import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_main")({
  component: MainLayout,
});

function MainLayout() {
  return (
    <div className="game-root fixed inset-0 overflow-hidden font-sans">
      {/* scan line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(136,136,136,0.6)] to-transparent animate-[scan_4s_ease-in-out_infinite] pointer-events-none z-10" />

      {/* Black half */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-[#0a0a0a]" />

      {/* White half */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[#f5f5f5]" />

      {/* Center divider */}
      <div className="absolute left-1/2 inset-y-0 w-px bg-gradient-to-b from-transparent via-[#888] to-transparent z-10" />

      <Outlet />
    </div>
  );
}
