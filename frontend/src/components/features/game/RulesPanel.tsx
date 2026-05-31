import { Link } from "@tanstack/react-router";

const HOW_TO_PLAY = [
  "Você vai receber uma sequência de perguntas aleatórias.",
  "Cada pergunta mostra um objeto, atividade ou conceito.",
  "Você decide: é coisa de Preto ou de Branco?",
];

const HOW_IT_WORKS = [
  "Não existe certo ou errado — existe o que a maioria escolheu.",
  "No final você vê a porcentagem de cada resposta.",
  "30 perguntas por rodada. Um novo sorteio a cada vez.",
];

export function RulesPanel() {
  return (
    <div className="relative w-full h-full flex overflow-hidden bg-[#0a0a0a]">
      {/* Black half */}
      <div
        className="flex-1 bg-[#0a0a0a] text-[#f5f5f5] flex flex-col justify-center px-20 py-24 gap-8 relative z-10"
        style={{ clipPath: "polygon(0 0, 58% 0, 42% 100%, 0 100%)" }}
      >
        <span className="text-[10px] font-extrabold tracking-[0.4em] uppercase opacity-40">
          Preto ou Branco?
        </span>
        <h2 className="text-[clamp(32px,4vw,56px)] font-black leading-[0.9] tracking-[-0.03em] uppercase">
          Como
          <br />
          Jogar
        </h2>
        <ul className="flex flex-col gap-5 max-w-sm">
          {HOW_TO_PLAY.map((text, i) => (
            <li
              key={text}
              className="flex gap-4 items-start text-[clamp(13px,1.2vw,15px)] leading-[1.55] opacity-80"
            >
              <span className="text-[10px] font-black tracking-[0.2em] opacity-40 min-w-[20px] mt-0.5">
                0{i + 1}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* White half */}
      <div
        className="flex-1 bg-[#f5f5f5] text-[#0a0a0a] flex flex-col justify-center py-24 gap-8 absolute inset-0"
        style={{
          clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)",
          paddingLeft: "140px",
          paddingRight: "80px",
        }}
      >
        <span className="text-[10px] font-extrabold tracking-[0.4em] uppercase opacity-40">
          Como funciona
        </span>
        <h2 className="text-[clamp(32px,4vw,56px)] font-black leading-[0.9] tracking-[-0.03em] uppercase">
          Sem
          <br />
          Erros
        </h2>
        <ul className="flex flex-col gap-5 max-w-sm">
          {HOW_IT_WORKS.map((text, i) => (
            <li
              key={text}
              className="flex gap-4 items-start text-[clamp(13px,1.2vw,15px)] leading-[1.55] opacity-80"
            >
              <span className="text-[10px] font-black tracking-[0.2em] opacity-40 min-w-[20px] mt-0.5">
                0{i + 4}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/play"
          className="mt-4 self-start px-10 py-4 text-[12px] font-extrabold tracking-[0.25em] uppercase bg-[#f5f5f5] text-[#0a0a0a] border-[3px] border-[#0a0a0a] shadow-[4px_4px_0_#0a0a0a] hover:-translate-y-0.5 transition-transform cursor-pointer"
        >
          Entendi — Jogar →
        </Link>
      </div>
    </div>
  );
}
