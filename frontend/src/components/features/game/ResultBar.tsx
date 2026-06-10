import { useEffect, useState } from "react";

interface ResultBarProps {
  pctPreto: number;
  pctBranco: number;
  textColor: string;
}

export function ResultBar({ pctPreto, pctBranco, textColor }: ResultBarProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const muted = `${textColor}80`;

  return (
    <div className="w-[clamp(240px,32vw,420px)] mt-9">
      <div
        className="flex justify-between text-xs font-extrabold tracking-[0.3em] uppercase mb-2"
        style={{ color: muted }}
      >
        <span>⬛ Preto</span>
        <span>⬜ Branco</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-[#0a0a0a] transition-[width_1s_cubic-bezier(0.77,0,0.175,1)]"
          style={{ width: animated ? `${pctPreto}%` : "50%" }}
        />
        <div
          className="h-full bg-[#f5f5f5] transition-[width_1s_cubic-bezier(0.77,0,0.175,1)]"
          style={{ width: animated ? `${pctBranco}%` : "50%" }}
        />
      </div>
      <div
        className="flex justify-between text-xs font-extrabold tracking-[0.2em] mt-1.5"
        style={{ color: muted }}
      >
        <span>{pctPreto}%</span>
        <span>{pctBranco}%</span>
      </div>
    </div>
  );
}
