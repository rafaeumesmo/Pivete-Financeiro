import { useState } from "react";
import { motion } from "framer-motion";
import { formatBRL } from "../lib/money.js";

/*
 * Torneio (duelo de cards) pra enquetes de ESCOLHA ÚNICA.
 * Modelo "rei da colina": a opção vencedora fica na arena e enfrenta a próxima
 * desafiante, até sobrar uma campeã. N opções → N-1 duelos (cobre par/ímpar e
 * o caso de só 2 opções = 1 duelo). Sem login.
 */
function DuelCard({ option, state, onPick, slide }) {
  // state: "idle" | "win" | "lose"
  const targets = {
    idle: { scale: 1, opacity: 1, x: 0, y: 0 },
    win:  { scale: 1.05, opacity: 1, x: 0, y: 0 },
    lose: { scale: 0.85, opacity: 0, x: slide === "x" ? 160 : 0, y: slide === "y" ? 120 : 0 },
  };
  const winning = state === "win";
  return (
    <motion.button
      layout
      onClick={() => state === "idle" && onPick(option)}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={targets[state]}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      whileTap={state === "idle" ? { scale: 0.97 } : undefined}
      className={`tema-escuro relative w-full sm:w-[260px] h-[30vh] sm:h-[400px] rounded-3xl overflow-hidden shadow-2xl select-none bg-gradient-to-br ${option.gradient} cursor-pointer`}
      style={winning ? { boxShadow: "0 0 0 3px #34d399, 0 0 44px rgba(52,211,153,0.55)" } : undefined}
    >
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[64px] sm:text-[80px] filter drop-shadow-2xl">{option.emoji || "🗳️"}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="text-xl font-bold text-white leading-tight">{option.label}</h3>
        {option.budget_cents > 0 && <span className="inline-block mt-1 text-[11px] font-semibold bg-black/30 text-white/85 px-2 py-0.5 rounded-full">💸 {formatBRL(option.budget_cents)}/pessoa</span>}
      </div>
      {winning && (
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-4 right-4 text-3xl filter drop-shadow-lg">🏆</motion.div>
      )}
    </motion.button>
  );
}

export function BoraTournament({ options, onChampion }) {
  const [champion, setChampion] = useState(options[0]);
  const [ci,       setCi]       = useState(1);          // índice da desafiante
  const [result,   setResult]   = useState(null);       // { winnerId } durante a animação
  const [done,     setDone]     = useState(false);

  const total = options.length - 1;
  const challenger = options[ci];

  // Guard defensivo: menos de 2 opções → campeã direta.
  if (!challenger) {
    if (!done) { setDone(true); setTimeout(() => onChampion(champion.id), 0); }
    return null;
  }

  function pick(winner) {
    if (result || done) return;
    try { if (navigator.vibrate) navigator.vibrate(40); } catch { /* noop */ }
    setResult({ winnerId: winner.id });
    setTimeout(() => {
      if (ci >= options.length - 1) { setDone(true); onChampion(winner.id); return; }
      setChampion(winner);
      setCi((n) => n + 1);
      setResult(null);
    }, 650);
  }

  const stateOf = (opt) => result ? (opt.id === result.winnerId ? "win" : "lose") : "idle";

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Progresso */}
      <div className="w-full max-w-[260px] sm:max-w-[420px]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-medium text-white/40">Duelo {ci} de {total}</span>
          <span className="text-[11px] text-white/25">Toque na sua preferida</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div className="h-full rounded-full bg-[#7c3aed]" initial={{ width: 0 }} animate={{ width: `${(ci / total) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>

      {/* Arena: empilhado no mobile, lado a lado no desktop */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 w-full">
        <DuelCard option={champion} state={stateOf(champion)} onPick={pick} slide="x" />
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center text-sm font-black text-white/60 -my-1 sm:my-0 z-10">VS</div>
        <DuelCard option={challenger} state={stateOf(challenger)} onPick={pick} slide="x" />
      </div>
    </div>
  );
}
