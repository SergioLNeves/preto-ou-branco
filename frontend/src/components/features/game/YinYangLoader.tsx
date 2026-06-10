interface Props {
  message?: string;
}

export function YinYangLoader({ message = "Conectando..." }: Props) {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center gap-10 z-50 font-sans">
      {/* Yin-Yang SVG giratório */}
      <div
        className="w-28 h-28"
        style={{
          animation: "yinyang-spin 2.4s linear infinite",
        }}
      >
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Metade branca (direita) */}
          <circle cx="50" cy="50" r="50" fill="#f5f5f5" />

          {/* Metade preta (esquerda) via path S-curve */}
          <path
            d="M50,0
               A50,50 0 0,0 50,100
               A25,25 0 0,0 50,50
               A25,25 0 0,1 50,0
               Z"
            fill="#0a0a0a"
          />

          {/* Bolinha preta no lado branco */}
          <circle cx="50" cy="25" r="12.5" fill="#0a0a0a" />
          {/* Bolinha branca no lado preto */}
          <circle cx="50" cy="75" r="12.5" fill="#f5f5f5" />

          {/* Ponto interno branco */}
          <circle cx="50" cy="25" r="4.5" fill="#f5f5f5" />
          {/* Ponto interno preto */}
          <circle cx="50" cy="75" r="4.5" fill="#0a0a0a" />
        </svg>
      </div>

      {/* Mensagem */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-extrabold tracking-[0.35em] uppercase text-[rgba(245,245,245,0.7)]">
          {message}
        </p>
        {/* Pontinhos pulsantes */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[rgba(245,245,245,0.3)]"
              style={{
                animation: `dot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes yinyang-spin {
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
