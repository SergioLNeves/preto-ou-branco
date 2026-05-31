import { Link } from "@tanstack/react-router";

interface InnerBackButtonProps {
  to: string;
  label: string;
}

export function InnerBackButton({ to, label }: InnerBackButtonProps) {
  return (
    <Link
      to={to}
      className="absolute top-7 left-10 z-50 flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase text-white/40 hover:text-white/90 transition-opacity bg-transparent border-none cursor-pointer"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M10 3L5 8l5 5" />
      </svg>
      {label}
    </Link>
  );
}
