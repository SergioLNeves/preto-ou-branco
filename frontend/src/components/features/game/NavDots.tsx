import { Link, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/home", title: "Início" },
] as const;

export function NavDots() {
  const matchRoute = useMatchRoute();

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[100] mix-blend-difference">
      {NAV_ITEMS.map((item) => {
        const isActive = !!matchRoute({ to: item.to });
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.title}
            className={cn(
              "w-1.5 h-1.5 rounded-full bg-white transition-all duration-200",
              isActive ? "opacity-100 scale-150" : "opacity-25",
            )}
          />
        );
      })}
    </nav>
  );
}
