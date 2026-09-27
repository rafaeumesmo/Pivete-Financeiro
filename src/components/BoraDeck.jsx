import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { formatBRL } from "../lib/money.js";

/*
 * Deck de swipe da votação "Bora?" — mesma mecânica do SwipeCard do Início
 * (drag + rotação + overlays + animação de saída), adaptada pras opções da
 * enquete. Só left/right: direita = "Bora" (voto sim), esquerda = "Passo".
 */
const SWIPE_THRESHOLD = 100;

const GRADIENTS = [
  "from-orange-600 via-red-600 to-rose-700",
  "from-violet-700 via-purple-700 to-indigo-800",
  "from-emerald-600 via-teal-600 to-cyan-700",
  "from-blue-600 via-sky-600 to-cyan-600",
  "from-amber-600 via-yellow-600 to-orange-500",
  "from-pink-600 via-fuchsia-600 to-purple-700",
  "from-cyan-600 via-blue-600 to-indigo-700",
  "from-lime-600 via-green-600 to-emerald-700",
];
export const gradientFor = (i) => GRADIENTS[i % GRADIENTS.length];

function BoraCard({ option, isTop, stackIndex, onSwipe }) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], prefersReducedMotion ? [0, 0] : [-18, 18]);
  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const redOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  function handleDragEnd(_, info) {
    const { velocity: { x: vx }, offset: { x: ox } } = info;
    if (ox > SWIPE_THRESHOLD || vx > 600)        onSwipe("right", option, { vx });
    else if (ox < -SWIPE_THRESHOLD || vx < -600) onSwipe("left", option, { vx });
    else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  }

  // Cards de baixo da pilha (não-topo)
  if (!isTop) {
    const ts = 1 - stackIndex * 0.04;
    const ty = stackIndex * 12;
    const to = 1 - stackIndex * 0.15;
    return (
      <motion.div
        className="absolute inset-0 mx-auto"
        initial={{ scale: ts, y: ty, opacity: to }}
        animate={{ scale: ts, y: ty, opacity: to }}
        transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.8 }}
        style={{ zIndex: 10 - stackIndex, width: "100%", originY: 1 }}
      >
        <div className={`tema-escuro w-full h-full rounded-3xl bg-gradient-to-br ${option.gradient} shadow-2xl`} />
      </motion.div>
    );
  }

  // Card do topo (arrastável)
  return (
    <motion.div
      className="absolute inset-0 mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateZ, zIndex: 20, width: "100%" }}
      drag
      dragConstraints={{ top: -120, bottom: 120, left: -300, right: 300 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileDrag={{ scale: 0.97, filter: "drop-shadow(0 24px 52px rgba(0,0,0,0.6))" }}
      variants={{
        exit: ({ vx = 0, dir } = {}) => {
          const cy = y.get();
          const sign = dir === "right" ? 1 : -1;
          const velRotate = prefersReducedMotion ? 0 : sign * Math.min(Math.abs(vx) / 160, 20);
          const exitDur = Math.max(0.26, 0.38 - Math.min(Math.abs(vx), 1200) / 5000);
          return { x: sign * 720, y: cy + 80, rotate: velRotate, opacity: 0, transition: { duration: exitDur, ease: [0.4, 0, 1, 1] } };
        },
      }}
      exit="exit"
    >
      <div className={`tema-escuro w-full h-full rounded-3xl overflow-hidden shadow-2xl relative select-none bg-gradient-to-br ${option.gradient}`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Emoji grande centralizado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[88px] filter drop-shadow-2xl">{option.emoji || "🗳️"}</span>
        </div>

        {/* Conteúdo */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">{option.label}</h2>
          {option.budget_cents > 0 && <span className="inline-block mt-1.5 text-[12px] font-semibold bg-black/30 text-white/85 px-2.5 py-1 rounded-full">💸 {formatBRL(option.budget_cents)} por pessoa</span>}
          {option.description && <p className="text-sm text-white/70 leading-relaxed mt-1.5">{option.description}</p>}
        </div>

        {/* Overlays Bora! / Passo */}
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(22,163,74,0.55)", opacity: greenOpacity }}>
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[-20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Bora! 🤙</span></div>
        </motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(220,38,38,0.55)", opacity: redOpacity }}>
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Passo</span></div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ActionBar({ onAction, disabled }) {
  const buttons = [
    { id: "left",  color: "border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400",       icon: "M6 18L18 6M6 6l12 12" },
    { id: "right", color: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400", icon: "M5 13l4 4L19 7" },
  ];
  return (
    <div className="flex items-center justify-center gap-8">
      {buttons.map((b) => (
        <motion.button key={b.id} onClick={() => !disabled && onAction(b.id)} disabled={disabled} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}
          className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${b.color} disabled:opacity-30`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d={b.icon} /></svg>
        </motion.button>
      ))}
    </div>
  );
}

export function BoraDeck({ options, type, onComplete }) {
  const [index, setIndex]       = useState(0);
  const [bora, setBora]         = useState([]); // option ids com "Bora"
  const [swipeExit, setSwipeExit] = useState({ vx: 0, dir: null });
  const [done, setDone]         = useState(false);

  function finish(finalBora) {
    if (done) return;
    setDone(true);
    // pequeno atraso pra deixar o card voar antes de trocar de tela
    setTimeout(() => onComplete(finalBora), 320);
  }

  function handleSwipe(dir, option, vel = {}) {
    if (done) return;
    try { if (navigator.vibrate) navigator.vibrate(dir === "right" ? 35 : 20); } catch { /* noop */ }
    setSwipeExit({ ...vel, dir });

    const isBora = dir === "right";
    const nextBora = isBora ? [...bora, option.id] : bora;
    setBora(nextBora);

    // Escolha única: o primeiro "Bora" decide; as outras viram passo.
    // Avança o índice pro fim pra esvaziar a pilha — o card atual sai animando.
    if (type === "single" && isBora) { setIndex(options.length); finish([option.id]); return; }

    const nextIndex = index + 1;
    setIndex(nextIndex); // sempre avança: o card swipado desmonta e voa
    if (nextIndex >= options.length) finish(nextBora);
  }

  const top = options[index];
  const upcoming = options.slice(index, index + 3);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Progresso */}
      <p className="text-[12px] font-medium text-white/35">
        Card {Math.min(index + 1, options.length)} de {options.length}
      </p>

      {/* Pilha de cards */}
      <div className="relative w-full max-w-[420px]" style={{ aspectRatio: "3 / 4" }}>
        <AnimatePresence custom={swipeExit}>
          {upcoming.map((opt, i) => (
            <BoraCard key={opt.id} option={opt} isTop={i === 0} stackIndex={i} onSwipe={handleSwipe} />
          ))}
        </AnimatePresence>
      </div>

      {/* Botões */}
      <div className="pt-1">
        <ActionBar disabled={done || !top} onAction={(dir) => top && handleSwipe(dir, top)} />
      </div>
      <div className="flex items-center gap-8 text-[10px] font-semibold tracking-widest uppercase">
        <span className="text-red-400/50">← Passo</span>
        <span className="text-emerald-400/50">Bora →</span>
      </div>
    </div>
  );
}
