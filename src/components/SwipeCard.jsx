import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { SWIPE_THRESHOLD, SWIPE_UP_THRESHOLD, deadlineBadge } from "../lib/deck.js";

export function SwipeCard({ task, onSwipe, isTop, stackIndex, onShare, onShareToFeed, isReturned = false, onOpenChecklist }) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], prefersReducedMotion ? [0, 0] : [-18, 18]);
  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const redOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const blueOpacity = useTransform(y, [SWIPE_UP_THRESHOLD, 0], [1, 0]);

  function handleDragEnd(_, info) {
    const { velocity: { x: vx, y: vy }, offset: { x: ox, y: oy } } = info;
    if (oy < SWIPE_UP_THRESHOLD || vy < -500) onSwipe("up", task, { vx: 0, vy });
    else if (ox > SWIPE_THRESHOLD || vx > 600) onSwipe("right", task, { vx, vy: 0 });
    else if (ox < -SWIPE_THRESHOLD || vx < -600) onSwipe("left", task, { vx, vy: 0 });
    else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  }

  // ── Cards da pilha (não-topo) ─────────────────────────────
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
        <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient} shadow-2xl`} />
      </motion.div>
    );
  }

  // ── Card do topo ──────────────────────────────────────────
  return (
    <motion.div
      className="absolute inset-0 mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateZ, zIndex: 20, width: "100%" }}
      drag
      dragConstraints={{ top: -300, bottom: 150, left: -300, right: 300 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      onTap={() => {
        if (task.items?.length > 0 && task._source !== "friend" && task._source !== "login_prompt") {
          onOpenChecklist?.(task);
        }
      }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, filter: "drop-shadow(0 0px 0px rgba(0,0,0,0))" }}
      whileDrag={{ scale: 0.97, filter: "drop-shadow(0 24px 52px rgba(0,0,0,0.6))" }}
      variants={{
        exit: ({ vx = 0, dir } = {}) => {
          const cx = x.get();
          const cy = y.get();
          if (dir === "up") {
            return {
              y: -700, x: cx * 1.5, rotate: prefersReducedMotion ? 0 : cx * 0.05, opacity: 0,
              transition: { duration: 0.42, ease: [0.4, 0, 1, 1] },
            };
          }
          const sign = dir === "right" ? 1 : -1;
          // rotação extra baseada na velocidade: quanto mais rápido, mais gira
          const velRotate = prefersReducedMotion ? 0 : sign * Math.min(Math.abs(vx) / 160, 20);
          // duração menor para swipes mais rápidos
          const exitDur = Math.max(0.26, 0.38 - Math.min(Math.abs(vx), 1200) / 5000);
          return {
            x: sign * 720,
            y: cy + 80, // arco natural: card cai levemente ao sair
            rotate: velRotate,
            opacity: 0,
            transition: { duration: exitDur, ease: [0.4, 0, 1, 1] },
          };
        },
      }}
      exit="exit"
    >
      <div className={`w-full h-full rounded-3xl overflow-hidden shadow-2xl relative select-none ${task.image ? "bg-black" : `bg-gradient-to-br ${task.gradient}`}`}>
        {task.image ? (
          <>
            <img src={task.image} className="absolute inset-0 w-full h-full object-cover" alt="" draggable={false} />
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${task.gradient} z-20 opacity-80`} />
          </>
        ) : (
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        )}
        <div className={`absolute inset-0 bg-gradient-to-t ${task.image ? "from-black/85 via-black/15 to-transparent" : "from-black/60 via-transparent to-transparent"}`} />

        {/* Author header for friend tasks */}
        {task._source === "friend" && task._author && (
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0 border-2 ${task._closeFriend ? "border-emerald-400" : "border-white/30"}`} style={{ background: "rgba(255,255,255,0.12)" }}>
              {task._author.avatar_emoji}
            </div>
            <span className="text-[12px] font-semibold text-white/90 truncate">@{task._author.username}</span>
            {task._closeFriend && <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-500/25 border border-emerald-500/40 px-1.5 py-0.5 rounded-full flex-shrink-0">close</span>}
          </div>
        )}

        {/* Login prompt special content */}
        {task._source === "login_prompt" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-[#2563eb]/20 border-2 border-[#2563eb]/40 flex items-center justify-center text-3xl mb-4">👋</div>
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#93c5fd]/60 mb-2">Rede social</p>
            <h2 className="text-xl font-bold text-white mb-2 leading-tight">Tasks dos seus amigos</h2>
            <p className="text-sm text-white/50 leading-relaxed">Entre para ver o que seus amigos estão decidindo e reagir às tasks deles.</p>
            <div className="mt-5 px-5 py-2 rounded-xl bg-[#2563eb] text-white text-sm font-semibold pointer-events-auto">Entrar com email →</div>
          </div>
        )}

        <div className={`absolute top-5 left-5 z-10 flex flex-col items-start gap-1.5 ${task._source === "friend" ? "top-12" : ""}`}>
          <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">{task.category}</span>
          {task.items?.length > 0 && (() => { const done = task.items.filter(i => i.done).length; return (
            <span className="text-[10px] font-semibold bg-white/20 backdrop-blur-sm text-white/85 px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {done}/{task.items.length}
            </span>
          ); })()}
        </div>
        <div className={`absolute right-5 z-10 text-4xl filter drop-shadow-lg ${task._source === "friend" ? "top-11" : "top-5"}`}>{task.emoji}</div>
        {onShare && (
          <button className="absolute top-[60px] right-5 z-40 w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/55 transition" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onShare(task); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
        )}
        {onShareToFeed && (
          <button className="absolute top-[100px] right-5 z-40 w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/55 transition" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onShareToFeed(task); }} title="Compartilhar no feed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>
          </button>
        )}
        {isReturned && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <span className="bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap shadow-lg">
              ⏰ De volta!
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5 leading-tight">{task.title}</h2>
          {task.deadline && (() => { const b = deadlineBadge(task.deadline); return b ? (
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${b.overdue ? "bg-red-500/30 text-red-200 animate-pulse" : "bg-black/25 text-white/70"}`}>{b.overdue ? "⚠️" : "🗓"} {b.label}</span>
          ) : null; })()}
          {task.items?.length > 0 ? (() => {
            const pending = task.items.filter(i => !i.done);
            if (pending.length === 0) return <p className="text-sm text-emerald-300/80 leading-relaxed">✓ Tudo marcado!</p>;
            const preview = pending.slice(0, 3).map(i => i.text).join("  ·  ");
            const more = pending.length > 3 ? `  +${pending.length - 3}` : "";
            return <p className="text-sm text-white/60 leading-relaxed truncate">{preview}{more}</p>;
          })() : <p className="text-sm text-white/70 leading-relaxed">{task.description}</p>}
        </div>
        {task.items?.length > 0 && (() => {
          const done = task.items.filter(i => i.done).length;
          const pct = Math.round((done / task.items.length) * 100);
          return (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-3xl z-10 overflow-hidden">
              <div className="h-full bg-white/50 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          );
        })()}
        {task.priority && (
          <div className="absolute bottom-6 right-6 z-10">
            <span className="text-[10px] font-semibold bg-black/30 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-full border border-white/10">
              {task.priority === "high" ? "🔴 Alta" : task.priority === "medium" ? "🟡 Média" : "🟢 Baixa"}
            </span>
          </div>
        )}
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(22,163,74,0.55)", opacity: greenOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[-20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">{task._source === "friend" ? "Aprovei!" : "Feito!"}</span></div></motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(220,38,38,0.55)", opacity: redOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">{task._source === "friend" ? "Passei" : "Fazer"}</span></div></motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(37,99,235,0.6)", opacity: blueOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2"><span className="text-white font-black text-2xl tracking-widest uppercase">{task._source === "friend" ? "Reshare ↑" : "Delegar ↑"}</span></div></motion.div>
      </div>
    </motion.div>
  );
}
