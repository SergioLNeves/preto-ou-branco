interface Props {
  message?: string;
}

export function YinYangLoader({ message = "Conectando..." }: Props) {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center gap-10 z-50 font-sans">
      {/* Círculo metade preto / metade branco girando */}
      <div
        className="w-28 h-28"
        style={{ animation: "half-spin 1.8s linear infinite" }}
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="circle-clip">
              <circle cx="50" cy="50" r="50" />
            </clipPath>
          </defs>
          {/* Metade branca (direita) */}
          <circle cx="50" cy="50" r="50" fill="#f5f5f5" />
          {/* Metade preta (esquerda) */}
          <rect x="0" y="0" width="50" height="100" fill="#0a0a0a" clipPath="url(#circle-clip)" />
        </svg>
      </div>

      {/* Mensagem */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-extrabold tracking-[0.35em] uppercase text-[rgba(245,245,245,0.7)]">
          {message}
        </p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[rgba(245,245,245,0.3)]"
              style={{ animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes half-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
