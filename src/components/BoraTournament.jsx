import { useState } from "react";
import { motion } from "framer-motion";
import { formatBRL } from "../lib/money.js";
import { Trophy, Vote } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";

/*
 * Torneio (duelo de cards) pra enquetes de ESCOLHA ÚNICA.
 * Modelo "rei da colina": a opção vencedora fica na arena e enfrenta a próxima
 * desafiante, até sobrar uma campeã. N opções → N-1 duelos (cobre par/ímpar e
 * o caso de só 2 opções = 1 duelo). Sem login.
 */
// on-color: parent bg-brand — textos de apoio dentro do card azul.
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
      className={`relative w-full sm:w-[260px] h-[30vh] sm:h-[400px] rounded-lg overflow-hidden shadow select-none bg-brand text-on-brand cursor-pointer ${winning ? "ring-4 ring-pos ring-offset-2 ring-offset-page" : ""}`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {option.emoji
          ? <span className="text-[56px] sm:text-[72px] leading-none">{option.emoji}</span>
          : <span className="w-16 h-16 rounded-lg bg-on-brand/15 flex items-center justify-center" aria-hidden><Vote size={32} strokeWidth={ICON_STROKE} /></span>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
        <h3 className="text-lg font-semibold leading-tight">{option.label}</h3>
        {option.budget_cents > 0 && <p className="mt-1 text-[13px] text-on-brand/75">{formatBRL(option.budget_cents)} por pessoa</p>}
      </div>
      {winning && (
        <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-4 right-4 w-9 h-9 rounded-md bg-on-brand text-pos flex items-center justify-center" aria-hidden><Trophy size={18} strokeWidth={ICON_STROKE} /></motion.span>
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
          <span className="text-[12px] font-medium text-fg-2">Duelo {ci} de {total}</span>
          <span className="text-[12px] text-fg-3">Toque na sua preferida</span>
        </div>
        <div className="h-1.5 rounded-sm bg-tile overflow-hidden">
          <motion.div className="h-full rounded-sm bg-brand" initial={{ width: 0 }} animate={{ width: `${(ci / total) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>

      {/* Arena: empilhado no mobile, lado a lado no desktop */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 w-full">
        <DuelCard option={champion} state={stateOf(champion)} onPick={pick} slide="x" />
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-surface border border-line flex items-center justify-center text-[13px] font-semibold text-fg-2 -my-1 sm:my-0 z-10">vs</div>
        <DuelCard option={challenger} state={stateOf(challenger)} onPick={pick} slide="x" />
      </div>
    </div>
  );
}
