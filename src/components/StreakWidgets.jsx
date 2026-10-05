import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { Flame, Shield, X } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { todayKey, toDateStr } from "../lib/dates.js";

function getWeekDots(streak) {
  const today = todayKey();
  const dots = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dots.push(toDateStr(d));
  }
  if (!streak.lastActiveDate) return dots.map(d => ({ date: d, active: false, isToday: d === today }));
  const activeDates = new Set();
  for (let i = 0; i < streak.count; i++) {
    const d = new Date(streak.lastActiveDate + "T00:00:00"); d.setDate(d.getDate() - i);
    activeDates.add(toDateStr(d));
  }
  return dots.map(d => ({ date: d, active: activeDates.has(d), isToday: d === today }));
}

// Progressão por nível: contorno cinza → âmbar → laranja → laranja
// preenchido → azul preenchido (Lendário). Sem glow e sem vermelho
// (vermelho é negativo/atrasado no app).
export function streakTier(count) {
  return count === 0 ? 0 : count <= 2 ? 1 : count <= 6 ? 2 : count <= 13 ? 3 : count <= 29 ? 4 : 5;
}
const TIER_COR = ["text-fg-3", "text-[#F59E0B]", "text-[#F97316]", "text-[#F97316]", "text-[#F97316]", "text-brand-ink"];
const TIER_FILL = [0, 0, 0, 1, 1, 1];

export function StreakIcon({ count, size = 18, className = "" }) {
  const tier = streakTier(count);
  return <Flame size={size} strokeWidth={ICON_STROKE} fill="currentColor" fillOpacity={TIER_FILL[tier]} className={`${TIER_COR[tier]} ${className}`} aria-hidden />;
}

export function StreakFlame({ count, onClick, compact = false }) {
  const shouldPulse = streakTier(count) >= 2;
  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.92 }} aria-label={`Sequência de ${count} ${count === 1 ? "dia" : "dias"}`} className={`flex items-center rounded-md hover:bg-tile transition ${compact ? "flex-col gap-0.5 px-2 py-1.5" : "gap-1 px-2 h-9"}`}>
      <AnimatePresence mode="wait">
        <motion.span key={count} className="inline-flex" initial={{ scale: 0.4, opacity: 0 }} animate={shouldPulse ? { scale: [1, 1.15, 0.95, 1], opacity: 1 } : { scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.4 }}>
          <StreakIcon count={count} />
        </motion.span>
      </AnimatePresence>
      <span className={`text-[13px] font-semibold tabular-nums leading-none ${count === 0 ? "text-fg-3" : "text-fg"}`}>{count}</span>
    </motion.button>
  );
}

export function StreakDetailModal({ streak, onClose }) {
  const weekDots = getWeekDots(streak);
  const DAY_LABELS = ["D","S","T","Q","Q","S","S"];
  const tier = streakTier(streak.count);
  const tierLabel = ["Inativo","Iniciante","Regular","Dedicado","Implacável","Lendário"][tier];
  const streakMessages = [
    "Zero dias. Isso é, basicamente, pré-histórico.",
    "1 dia. Você começou. Surpreendente.",
    `${streak.count} dias. Continue assim ou esqueça.`,
    `${streak.count} dias. Você tem consistência. Não estrague.`,
    `${streak.count} dias. Isso tá ficando sério.`,
    `${streak.count} dias lendários. Você virou uma máquina.`,
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0" onClick={onClose}>
      <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="w-full max-w-sm bg-surface rounded-lg border border-line shadow overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <h3 className="text-base font-semibold text-fg">Sequência</h3>
            <p className="text-[13px] text-fg-2">Nível: {tierLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 -mr-1.5 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition"><X size={18} strokeWidth={ICON_STROKE} aria-hidden /></button>
        </div>
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-12 h-12 rounded-md bg-tile flex items-center justify-center"><StreakIcon count={streak.count} size={26} /></span>
            <p className="text-3xl font-bold text-fg tabular-nums">{streak.count} <span className="text-base font-medium text-fg-2">{streak.count === 1 ? "dia" : "dias"}</span></p>
          </div>
          <p className="text-[13px] font-medium text-fg-2 mb-2">Esta semana</p>
          <div className="flex justify-between gap-1.5 mb-5">
            {weekDots.map((dot, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square max-w-[36px] rounded-md flex items-center justify-center ${dot.active ? "bg-[#F97316]/15 text-[#F97316]" : "bg-tile"} ${dot.isToday ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""}`}>
                  {dot.active && <Flame size={16} strokeWidth={ICON_STROKE} aria-hidden />}
                </div>
                <span className="text-[11px] text-fg-3">{DAY_LABELS[new Date(dot.date + "T12:00:00").getDay()]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Atual", val: streak.count },
              { label: "Recorde", val: streak.best },
              { label: streak.freezesAvailable === 1 ? "Escudo" : "Escudos", val: streak.freezesAvailable },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-md border border-line p-3 text-center">
                <div className="text-lg font-semibold text-fg tabular-nums leading-none mb-1">{val}</div>
                <div className="text-[12px] text-fg-2">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-fg-2 leading-relaxed">{streakMessages[tier]}</p>
        </div>
      </motion.div>
    </div>
  );
}

export function StreakBrokenModal({ oldCount, best, hasFreeze, onUseFreeze, onLetBreak }) {
  const prefersReducedMotion = useReducedMotion();
  const [relit, setRelit] = useState(false);
  function handleUseFreeze() {
    setRelit(true);
    setTimeout(() => {
      if (!prefersReducedMotion) {
        try {
          const colors = ["#F97316", "#1F3FD6", "#16A34A"];
          const end = Date.now() + 1400;
          (function shoot() {
            confetti({ particleCount: 4, spread: 60, origin: { x: 0.3, y: 0.5 }, colors });
            confetti({ particleCount: 4, spread: 60, origin: { x: 0.7, y: 0.5 }, colors });
            if (Date.now() < end) requestAnimationFrame(shoot);
          })();
        } catch {}
      }
      onUseFreeze();
    }, 380);
  }
  const card = "w-full max-w-sm bg-surface rounded-lg border border-line shadow";
  const icone = "mx-auto mb-4 w-14 h-14 rounded-md bg-tile flex items-center justify-center";
  if (!hasFreeze) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className={card}>
          <div className="px-5 pt-7 pb-5 text-center">
            <span className={`${icone} text-fg-3`}><Flame size={28} strokeWidth={ICON_STROKE} aria-hidden /></span>
            <h2 className="text-lg font-semibold text-fg mb-1.5">Sua sequência acabou</h2>
            <p className="text-sm text-fg-2 mb-1">Eram <span className="text-fg font-semibold">{oldCount} {oldCount === 1 ? "dia" : "dias"}</span> seguidos.</p>
            {best > 0 && <p className="text-[13px] text-fg-3 mb-5">Recorde: <span className="text-fg-2 font-medium">{best} dias</span></p>}
            <button type="button" onClick={onLetBreak} className="w-full py-3 rounded-md bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hover transition">Começar de novo</button>
          </div>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className={card}>
        <div className="px-5 pt-7 pb-5 text-center">
          <motion.span animate={relit ? { scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.5 }} className={`${icone} ${relit ? "text-[#F97316]" : "text-fg-3"}`}><Flame size={28} strokeWidth={ICON_STROKE} aria-hidden /></motion.span>
          <h2 className="text-lg font-semibold text-fg mb-1.5">Quase perdeu a sequência</h2>
          <p className="text-sm text-fg-2 mb-4">Sua sequência de <span className="text-fg font-semibold">{oldCount} {oldCount === 1 ? "dia" : "dias"}</span> está em risco.</p>
          <div className="rounded-md border border-line p-3.5 mb-5 text-left flex gap-3">
            <Shield size={20} strokeWidth={ICON_STROKE} className="text-warn flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-[13px] text-fg font-semibold mb-0.5">Você tem 1 escudo</p>
              <p className="text-[13px] text-fg-2 leading-relaxed">Usar o escudo mantém sua sequência, como se você tivesse usado o app ontem.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onLetBreak} className="flex-1 py-3 rounded-md border border-line bg-surface text-sm font-medium text-fg-2 hover:bg-tile transition">Deixar quebrar</button>
            <button type="button" onClick={handleUseFreeze} className="flex-1 py-3 rounded-md bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hover transition inline-flex items-center justify-center gap-2"><Shield size={16} strokeWidth={ICON_STROKE} aria-hidden />Usar escudo</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
