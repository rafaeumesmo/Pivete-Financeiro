import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
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

export function StreakFlame({ count, onClick }) {
  const tier = count === 0 ? 0 : count <= 2 ? 1 : count <= 6 ? 2 : count <= 13 ? 3 : count <= 29 ? 4 : 5;
  const cfg = [
    { sz: "text-sm",  glow: "",                                              numCol: "text-white/20"  },
    { sz: "text-sm",  glow: "",                                              numCol: "text-orange-400" },
    { sz: "text-base",glow: "drop-shadow(0 0 6px rgba(251,146,60,0.55))",   numCol: "text-orange-300" },
    { sz: "text-lg",  glow: "drop-shadow(0 0 8px rgba(252,211,77,0.6))",    numCol: "text-amber-200"  },
    { sz: "text-lg",  glow: "drop-shadow(0 0 10px rgba(125,211,252,0.65))", numCol: "text-sky-200"    },
    { sz: "text-xl",  glow: "drop-shadow(0 0 14px rgba(254,240,138,0.8))",  numCol: "text-yellow-100" },
  ][tier];
  const shouldPulse = tier >= 2;
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.88 }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.05] transition">
      <AnimatePresence mode="wait">
        <motion.span key={count} className={`${cfg.sz} leading-none select-none`} style={{ filter: cfg.glow }} initial={{ scale: 0.3, rotate: -15, opacity: 0 }} animate={shouldPulse ? { scale: [1, 1.2, 0.93, 1.06, 1], rotate: 0, opacity: 1 } : { scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ duration: 0.45, ease: "backOut" }}>🔥</motion.span>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.span key={count} className={`text-[13px] font-bold tabular-nums leading-none ${cfg.numCol}`} initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 5, opacity: 0 }} transition={{ duration: 0.22 }}>{count}</motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export function StreakDetailModal({ streak, onClose }) {
  const weekDots = getWeekDots(streak);
  const DAY_LABELS = ["D","S","T","Q","Q","S","S"];
  const tier = streak.count === 0 ? 0 : streak.count <= 2 ? 1 : streak.count <= 6 ? 2 : streak.count <= 13 ? 3 : streak.count <= 29 ? 4 : 5;
  const tierLabel = ["Inativo","Iniciante","Regular","Dedicado","Implacável","Lendário"][tier];
  const tierBadge = ["bg-white/[0.06] text-white/30","bg-orange-500/20 text-orange-300","bg-orange-500/20 text-orange-300","bg-amber-500/20 text-amber-300","bg-sky-500/20 text-sky-300","bg-yellow-400/20 text-yellow-300"][tier];
  const streakMessages = [
    "Zero dias. Isso é, basicamente, pré-histórico.",
    "1 dia. Você começou. Surpreendente.",
    `${streak.count} dias. Continue assim ou esqueça.`,
    `${streak.count} dias. Você tem consistência. Não estrague.`,
    `${streak.count} dias. Isso tá ficando sério.`,
    `${streak.count} dias lendários. Você virou uma máquina.`,
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.96 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-5 pt-6 pb-5">
          {/* Flame */}
          <div className="flex flex-col items-center mb-5">
            <motion.div animate={streak.count > 0 ? { scale: [1, 1.14, 0.94, 1.07, 1] } : {}} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="text-6xl mb-3 leading-none select-none">{streak.count === 0 ? "💤" : "🔥"}</motion.div>
            <div className="text-3xl font-black text-white mb-1.5">{streak.count} <span className="text-lg font-semibold text-white/40">{streak.count === 1 ? "dia" : "dias"}</span></div>
            <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full ${tierBadge}`}>{tierLabel}</span>
          </div>
          {/* Week dots */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/25 mb-3 text-center">Esta semana</p>
            <div className="flex justify-center gap-2">
              {weekDots.map((dot, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${dot.active ? "bg-orange-500/40 border border-orange-500/50" : "bg-white/[0.05] border border-white/[0.07]"} ${dot.isToday ? "ring-2 ring-orange-400 ring-offset-2 ring-offset-[#18191f]" : ""}`}>
                    {dot.active && "🔥"}
                  </div>
                  <span className="text-[9px] text-white/25 font-medium">{DAY_LABELS[new Date(dot.date + "T12:00:00").getDay()]}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Atual",   val: streak.count,          color: "text-amber-400"  },
              { label: "Recorde", val: streak.best,            color: "text-white"      },
              { label: streak.freezesAvailable === 0 ? "Sem escudo" : streak.freezesAvailable === 1 ? "1 escudo" : "2 escudos", val: streak.freezesAvailable === 0 ? "—" : "🛡️".repeat(streak.freezesAvailable), color: "text-blue-300" },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-3 text-center">
                <div className={`text-lg font-black ${color} leading-none mb-1`}>{val}</div>
                <div className="text-[10px] text-white/30">{label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 mb-5">
            <p className="text-[13px] text-white/55 italic leading-relaxed">"{streakMessages[tier]}"</p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/50 hover:text-white/70 transition">Fechar</button>
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
          const colors = ["#f59e0b","#ef4444","#3b82f6"];
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
  if (!hasFreeze) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 backdrop-blur-sm px-4">
        <motion.div initial={{ opacity: 0, scale: 0.86, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl">
          <div className="px-5 pt-8 pb-6 text-center">
            <motion.div animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 2.2, repeat: Infinity }} className="text-6xl mb-4 leading-none grayscale">🔥</motion.div>
            <h2 className="text-xl font-black text-white mb-2">Streak acabou 💀</h2>
            <p className="text-sm text-white/40 mb-1">Era <span className="text-white font-bold">{oldCount} {oldCount === 1 ? "dia" : "dias"}</span> consecutivos.</p>
            {best > 0 && <p className="text-[12px] text-white/25 mb-5">Recorde continua: <span className="text-white/50 font-semibold">{best} dias</span></p>}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 mb-5 text-left">
              <p className="text-[13px] text-white/50 italic">"Todo recorde que você vai bater começa exatamente aqui."</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onLetBreak} className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition">Começar de novo 🔥</motion.button>
          </div>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.86, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl">
        <div className="px-5 pt-8 pb-6 text-center">
          <motion.div animate={relit ? { scale: [1, 1.35, 1] } : { opacity: [1, 0.5, 1] }} transition={{ duration: relit ? 0.5 : 2, repeat: relit ? 0 : Infinity, ease: "easeInOut" }} className={`text-6xl mb-4 leading-none ${relit ? "" : "opacity-70"}`}>🔥</motion.div>
          <h2 className="text-xl font-black text-white mb-2">Quase perdeu! 😅</h2>
          <p className="text-sm text-white/40 mb-4">Seu streak de <span className="text-white font-bold">{oldCount} {oldCount === 1 ? "dia" : "dias"}</span> está em risco.</p>
          <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl p-3.5 mb-5 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🛡️</span>
              <p className="text-[12px] text-amber-300 font-semibold">Você tem 1 proteção de streak</p>
            </div>
            <p className="text-[12px] text-white/35 leading-relaxed">Usar o escudo mantém seu streak, como se você tivesse usado o app ontem.</p>
          </div>
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onLetBreak} className="flex-1 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/40 hover:text-white/60 transition">Deixar quebrar</motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleUseFreeze} className="flex-1 py-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-sm font-semibold text-amber-300 hover:bg-amber-500/30 transition">🛡️ Usar escudo</motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
