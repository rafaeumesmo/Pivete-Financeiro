import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { formatBRL } from "../lib/money.js";
import { Check, X, Vote } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { ActionButtons } from "./ActionButtons.jsx";

/*
 * Deck de swipe da votação "Bora?" — mesma mecânica do SwipeCard do Início
 * (drag + rotação + overlays + animação de saída), adaptada pras opções da
 * enquete. Só left/right: direita = "Bora" (voto sim), esquerda = "Passo".
 */
const SWIPE_THRESHOLD = 100;


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
        <div className="w-full h-full rounded-lg bg-stack" />
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
      whileDrag={{ scale: 0.98 }}
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
      <div className="w-full h-full rounded-lg overflow-hidden shadow relative select-none bg-brand text-on-brand">
        {/* Emoji da opção (escrito por quem criou a enquete) ou ícone padrão */}
        <div className="absolute inset-0 flex items-center justify-center">
          {option.emoji
            ? <span className="text-[72px] leading-none">{option.emoji}</span>
            : <span className="w-20 h-20 rounded-lg bg-on-brand/15 flex items-center justify-center" aria-hidden><Vote size={40} strokeWidth={ICON_STROKE} /></span>}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <h2 className="text-xl font-semibold leading-tight">{option.label}</h2>
          {option.budget_cents > 0 && <p className="mt-1 text-[13px] text-on-brand/75">{formatBRL(option.budget_cents)} por pessoa</p>}
          {option.description && <p className="text-[13px] text-on-brand/75 leading-relaxed mt-1">{option.description}</p>}
        </div>

        <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 pointer-events-none" style={{ backgroundColor: "rgb(var(--pos) / 0.92)", opacity: greenOpacity }}>
          <Check size={40} strokeWidth={ICON_STROKE} aria-hidden /><span className="text-xl font-semibold">Bora!</span>
        </motion.div>
        <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 pointer-events-none" style={{ backgroundColor: "rgb(var(--neg) / 0.92)", opacity: redOpacity }}>
          <X size={40} strokeWidth={ICON_STROKE} aria-hidden /><span className="text-xl font-semibold">Passo</span>
        </motion.div>
      </div>
    </motion.div>
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
      <p className="text-[12px] font-medium text-fg-3">
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
        <ActionButtons labels={{ left: "Passo", right: "Bora" }} disabled={done || !top} onAction={(dir) => top && handleSwipe(dir, top)} />
      </div>
    </div>
  );
}
