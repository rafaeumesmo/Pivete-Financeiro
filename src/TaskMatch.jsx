import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// ── Storage keys ─────────────────────────────────────────────
const SK = {
  tasks:     "tm_tasks",
  stats:     "tm_stats",
  invites:   "tm_invites",
  profile:   "tm_profile",
  nextId:    "tm_next_id",
  raf:       "taskmatch_raf_history",
  decisions: "tm_decisions",  // histórico imutável de swipes
};

// ── Helpers de storage ────────────────────────────────────────
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function usePersistedState(key, fallback) {
  const [state, setState] = useState(() => load(key, fallback));
  const set = useCallback((valueOrUpdater) => {
    setState((prev) => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      save(key, next);
      return next;
    });
  }, [key]);
  return [state, set];
}

const INITIAL_TASKS = [
  { id: 1, title: "Pedir Pizza", description: "Todo mundo tá com fome. Escolher sabores e fazer o pedido até às 19h.", category: "Alimentação", emoji: "🍕", gradient: "from-orange-600 via-red-600 to-rose-700", accent: "#f97316" },
  { id: 2, title: "Ver Filme", description: "Dune: Parte 2 ou Oppenheimer? Alguém escolhe, a gente vai junto.", category: "Lazer", emoji: "🎬", gradient: "from-violet-700 via-purple-700 to-indigo-800", accent: "#8b5cf6" },
  { id: 3, title: "Academia", description: "Treino de pernas marcado pra terça às 7h. Confirmar presença.", category: "Saúde", emoji: "💪", gradient: "from-emerald-600 via-teal-600 to-cyan-700", accent: "#10b981" },
  { id: 4, title: "Estudar IHC", description: "Revisar heurísticas de Nielsen antes da apresentação de quinta.", category: "Estudos", emoji: "📖", gradient: "from-blue-600 via-sky-600 to-cyan-600", accent: "#3b82f6" },
  { id: 5, title: "Reunião de Equipe", description: "Sprint planning semanal. Preparar card de bloqueios e progresso.", category: "Trabalho", emoji: "🗓️", gradient: "from-amber-600 via-yellow-600 to-orange-500", accent: "#f59e0b" },
];

const SWIPE_THRESHOLD = 100;
const SWIPE_UP_THRESHOLD = -80;

const ONBOARDING_GRADIENTS = {
  Alimentação: { gradient: "from-orange-600 via-red-600 to-rose-700",    accent: "#f97316" },
  Lazer:       { gradient: "from-violet-700 via-purple-700 to-indigo-800", accent: "#8b5cf6" },
  Saúde:       { gradient: "from-emerald-600 via-teal-600 to-cyan-700",   accent: "#10b981" },
  Estudos:     { gradient: "from-blue-600 via-sky-600 to-cyan-600",       accent: "#3b82f6" },
  Trabalho:    { gradient: "from-amber-600 via-yellow-600 to-orange-500", accent: "#f59e0b" },
};

// ── SwipeCard ────────────────────────────────────────────────
function SwipeCard({ task, onSwipe, isTop, stackIndex }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-18, 18]);
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
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, filter: "drop-shadow(0 0px 0px rgba(0,0,0,0))" }}
      whileDrag={{ scale: 0.97, filter: "drop-shadow(0 24px 52px rgba(0,0,0,0.6))" }}
      variants={{
        exit: ({ vx = 0, vy = 0, dir } = {}) => {
          const cx = x.get();
          const cy = y.get();
          if (dir === "up") {
            return {
              y: -700, x: cx * 1.5, rotate: cx * 0.05, opacity: 0,
              transition: { duration: 0.42, ease: [0.4, 0, 1, 1] },
            };
          }
          const sign = dir === "right" ? 1 : -1;
          // rotação extra baseada na velocidade: quanto mais rápido, mais gira
          const velRotate = sign * Math.min(Math.abs(vx) / 160, 20);
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
      <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient} overflow-hidden shadow-2xl relative select-none`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-5 left-5 z-10"><span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">{task.category}</span></div>
        <div className="absolute top-5 right-5 z-10 text-4xl filter drop-shadow-lg">{task.emoji}</div>
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2 leading-tight">{task.title}</h2>
          <p className="text-sm text-white/70 leading-relaxed">{task.description}</p>
        </div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(22,163,74,0.55)", opacity: greenOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[-20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Aceito!</span></div></motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(220,38,38,0.55)", opacity: redOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Depois</span></div></motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(37,99,235,0.6)", opacity: blueOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2"><span className="text-white font-black text-2xl tracking-widest uppercase">Delegar ↑</span></div></motion.div>
      </div>
    </motion.div>
  );
}

// ── ActionButtons ────────────────────────────────────────────
function ActionButtons({ onAction, disabled }) {
  const buttons = [
    { id: "left", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>, color: "border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400", size: "w-14 h-14" },
    { id: "up",   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>, color: "border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400", size: "w-12 h-12" },
    { id: "right", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>, color: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400", size: "w-14 h-14" },
  ];
  return (
    <div className="flex items-center justify-center gap-5">
      {buttons.map((btn) => (
        <motion.button key={btn.id} onClick={() => !disabled && onAction(btn.id)} disabled={disabled} className={`${btn.size} rounded-full border-2 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${btn.color} disabled:opacity-30 disabled:cursor-not-allowed`} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}>{btn.icon}</motion.button>
      ))}
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────
function Toast({ message, color, visible }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }} className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-xl pointer-events-none ${color}`}>
      {message}
    </motion.div>
  );
}

// ── EmptyState ───────────────────────────────────────────────
function EmptyState({ stats, onReset }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-6xl mb-5">🎉</div>
      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Deck Finalizado!</h3>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">Suas decisões foram registradas.</p>
      <div className="flex gap-4 mb-8">
        {[{ label: "Aceitos", value: stats.accepted, color: "text-emerald-400" }, { label: "Depois", value: stats.rejected, color: "text-red-400" }, { label: "Delegados", value: stats.shared, color: "text-blue-400" }].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-white/40 mt-0.5">{label}</span>
          </div>
        ))}
      </div>
      <motion.button onClick={onReset} className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-white font-semibold text-sm tracking-wide hover:bg-blue-500 transition-colors" whileTap={{ scale: 0.97 }}>Recomeçar deck</motion.button>
    </motion.div>
  );
}

// ── ExploreTab ───────────────────────────────────────────────
// ── Onboarding ────────────────────────────────────────────────

function OBMiniCard({ cardX, cardY }) {
  const rotateZ = useTransform(cardX, [-180, 180], [-20, 20]);
  const greenOp = useTransform(cardX, [0, 90], [0, 1]);
  const redOp   = useTransform(cardX, [-90, 0], [1, 0]);
  const blueOp  = useTransform(cardY, [-90, 0], [1, 0]);
  return (
    <motion.div className="rounded-2xl overflow-hidden shadow-2xl relative flex-shrink-0" style={{ x: cardX, y: cardY, rotate: rotateZ, width: 192, height: 256 }}>
      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-600 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3 z-10"><span className="text-[8px] font-semibold tracking-widest uppercase bg-white/20 text-white/90 px-2 py-0.5 rounded-full border border-white/20">Estudos</span></div>
        <div className="absolute top-3 right-3 z-10 text-2xl">📖</div>
        <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10">
          <p className="text-sm font-bold text-white">Estudar IHC</p>
          <p className="text-[11px] text-white/55 mt-0.5 line-clamp-2">Revisar heurísticas de Nielsen.</p>
        </div>
      </div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(22,163,74,0.55)", opacity: greenOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1 -rotate-[20deg]"><span className="text-white font-black text-sm tracking-widest uppercase">Aceito!</span></div></motion.div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(220,38,38,0.55)", opacity: redOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1 rotate-[20deg]"><span className="text-white font-black text-sm tracking-widest uppercase">Depois</span></div></motion.div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(37,99,235,0.6)", opacity: blueOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1"><span className="text-white font-black text-sm tracking-widest uppercase">Delegar ↑</span></div></motion.div>
    </motion.div>
  );
}

function OBStep1() {
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  useEffect(() => {
    let dead = false;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    (async () => {
      while (!dead) {
        await wait(550); if (dead) return;
        await animate(cardX, 152, { duration: 0.42, ease: "easeOut" });
        await wait(620); if (dead) return;
        await animate(cardX, 0, { type: "spring", stiffness: 300, damping: 22 });
        await wait(500); if (dead) return;
        await animate(cardX, -152, { duration: 0.42, ease: "easeOut" });
        await wait(620); if (dead) return;
        await animate(cardX, 0, { type: "spring", stiffness: 300, damping: 22 });
      }
    })();
    return () => { dead = true; };
  }, []);
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col items-center gap-5">
      <div className="flex justify-center" style={{ height: 256 }}><OBMiniCard cardX={cardX} cardY={cardY} /></div>
      <div className="text-center">
        <h3 className="text-white font-bold text-[17px] mb-2">Aceite ou recuse</h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Arraste para a <span className="text-emerald-400 font-medium">direita</span> para aceitar.
          Para a <span className="text-red-400 font-medium">esquerda</span> para deixar pra depois.
        </p>
      </div>
    </motion.div>
  );
}

function OBStep2() {
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  useEffect(() => {
    let dead = false;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    (async () => {
      while (!dead) {
        await wait(500); if (dead) return;
        await animate(cardY, -152, { duration: 0.42, ease: "easeOut" });
        await wait(650); if (dead) return;
        await animate(cardY, 0, { type: "spring", stiffness: 280, damping: 22 });
      }
    })();
    return () => { dead = true; };
  }, []);
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col items-center gap-5">
      <div className="flex justify-center" style={{ height: 256 }}><OBMiniCard cardX={cardX} cardY={cardY} /></div>
      <div className="text-center">
        <h3 className="text-white font-bold text-[17px] mb-2">Delegar tarefas</h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Arraste para <span className="text-blue-400 font-medium">cima</span> para delegar. Um link de convite é gerado para você compartilhar com quem quiser.
        </p>
      </div>
    </motion.div>
  );
}

function OBStep3({ onBack, onFinish }) {
  const [data, setData] = useState({ title: "", description: "", category: "Alimentação", emoji: "✨" });
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3.5">
      <div><h3 className="text-white font-bold text-[17px] mb-1">Crie sua primeira tarefa</h3><p className="text-white/40 text-sm">Adicione algo que precisa decidir hoje.</p></div>
      <input ref={titleRef} value={data.title} onChange={e => setData(p => ({ ...p, title: e.target.value }))} placeholder="Título da tarefa..." className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition" />
      <textarea value={data.description} onChange={e => setData(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)..." rows={2} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 resize-none transition" />
      <div className="grid grid-cols-2 gap-2">
        <select value={data.category} onChange={e => setData(p => ({ ...p, category: e.target.value }))} className="rounded-xl border border-white/[0.08] bg-[#18191f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#2563eb]/60">
          {Object.keys(ONBOARDING_GRADIENTS).map(c => (<option key={c} value={c} className="bg-[#18191f]">{c}</option>))}
        </select>
        <input value={data.emoji} onChange={e => setData(p => ({ ...p, emoji: e.target.value }))} placeholder="Emoji" className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition text-center" />
      </div>
      <div className="flex gap-2 pt-1">
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={onBack} className="px-3.5 py-2.5 rounded-xl text-sm text-white/40 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition">← Voltar</motion.button>
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => onFinish(null)} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition">Pular</motion.button>
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => onFinish(data.title.trim() ? data : null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-blue-500 transition">
          {data.title.trim() ? "Criar →" : "Entrar →"}
        </motion.button>
      </div>
    </motion.div>
  );
}

function Onboarding({ onFinish, onCreateTask }) {
  const [step, setStep] = useState(0);
  const TOTAL = 3;
  function complete(taskData) { if (taskData?.title?.trim()) onCreateTask(taskData); onFinish(); }
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-5 bg-black/60 backdrop-blur-[2px]">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/[0.09] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
          <div><p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">Bem-vindo ao</p><h2 className="text-[20px] font-black text-white leading-none">Task<span style={{ color: "#2563eb" }}>Match</span></h2></div>
          <span className="text-[11px] text-white/25">{step + 1} / {TOTAL}</span>
        </div>
        {/* Content */}
        <div className="px-6 pt-5 pb-4" style={{ minHeight: 348 }}>
          <AnimatePresence mode="wait">
            {step === 0 && <OBStep1 key="ob0" />}
            {step === 1 && <OBStep2 key="ob1" />}
            {step === 2 && <OBStep3 key="ob2" onBack={() => setStep(1)} onFinish={complete} />}
          </AnimatePresence>
        </div>
        {/* Footer: dots + nav (steps 0-1) or dots only (step 2) */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-[#2563eb]" : "w-1.5 bg-white/15"}`} />
            ))}
          </div>
          {step < 2 && (
            <div className="flex gap-2">
              {step > 0 && <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-xl text-sm text-white/40 bg-white/[0.05] border border-white/[0.07] hover:bg-white/[0.08] transition">Voltar</motion.button>}
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(s => s + 1)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-blue-500 transition">Próximo</motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── ExploreTab ─────────────────────────────────────────────────
function ExploreTab({ invites, addRecipient, updateRecipientStatus, shareInvite, isMobile }) {
  const [expandedId, setExpandedId] = useState(null);
  const [inputValues, setInputValues] = useState({});

  const statusColor = (s) => s === "accepted" ? "text-emerald-400" : s === "declined" ? "text-red-400" : "text-white/30";
  const statusLabel = (s) => s === "accepted" ? "Aceitou" : s === "declined" ? "Recusou" : "Aguardando";
  const statusDot   = (s) => s === "accepted" ? "bg-emerald-400" : s === "declined" ? "bg-red-400" : "bg-white/20";

  return (
    <motion.div
      className={`flex flex-col h-full overflow-y-auto ${isMobile ? "px-5 pt-4" : "px-10 pt-10 pb-10"}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={isMobile ? "" : "max-w-2xl mx-auto w-full"}>
        {/* Header */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Explorar</p>
          <h2 className={`font-bold text-white mb-1 ${isMobile ? "text-lg" : "text-xl"}`}>Convites enviados</h2>
          <p className="text-sm text-white/40">Delegue tarefas e acompanhe quem aceitou ou recusou em tempo real.</p>
        </div>

        {invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06] p-12 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-xl text-white/20">↑</div>
            <div>
              <p className="text-sm font-medium text-white/40">Nenhum convite enviado ainda</p>
              <p className="text-xs text-white/20 mt-1">Arraste um card para cima para delegar uma tarefa.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-6">
            {invites.map((invite) => {
              const isExpanded = expandedId === invite.id;
              const accepted = invite.recipients.filter((r) => r.status === "accepted").length;
              const declined = invite.recipients.filter((r) => r.status === "declined").length;
              const pending  = invite.recipients.filter((r) => r.status === "pending").length;

              return (
                <div key={invite.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
                  {/* gradient strip */}
                  <div className={`h-1 w-full bg-gradient-to-r ${invite.gradient}`} />

                  <div className="p-4">
                    {/* Task row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${invite.gradient} flex items-center justify-center text-lg flex-shrink-0 shadow-lg`}>
                        {invite.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/30">{invite.category}</span>
                          <span className="text-white/15 text-xs">·</span>
                          <span className="text-[10px] text-white/25">
                            {new Date(invite.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-tight">{invite.title}</p>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{invite.description}</p>
                      </div>
                      <button
                        onClick={() => shareInvite(invite)}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.09] transition"
                        title="Compartilhar convite"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-white/50">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>

                    {/* Status pills */}
                    {invite.recipients.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {accepted > 0 && <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{accepted} aceitou{accepted > 1 ? "ram" : ""}</span>}
                        {declined > 0 && <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{declined} recusou{declined > 1 ? "ram" : ""}</span>}
                        {pending  > 0 && <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/30 bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-white/25" />{pending} aguardando</span>}
                      </div>
                    )}

                    {/* Toggle */}
                    <button onClick={() => setExpandedId(isExpanded ? null : invite.id)} className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      {invite.recipients.length === 0 ? "Adicionar destinatários" : `${invite.recipients.length} destinatário${invite.recipients.length > 1 ? "s" : ""}`}
                    </button>

                    {/* Expanded */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                          <div className="pt-3 flex flex-col gap-2">
                            {invite.recipients.map((r) => (
                              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <div className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center text-xs text-white/50 font-semibold flex-shrink-0">{r.name[0]?.toUpperCase()}</div>
                                <span className="flex-1 text-sm text-white/70 truncate">{r.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(r.status)}`} />
                                  <span className={`text-[11px] font-medium ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                                </div>
                                {r.status === "pending" && (
                                  <div className="flex gap-1 ml-1">
                                    <button onClick={() => updateRecipientStatus(invite.id, r.id, "accepted")} className="w-6 h-6 rounded-lg bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center hover:bg-emerald-400/25 transition" title="Simular aceitar">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                    <button onClick={() => updateRecipientStatus(invite.id, r.id, "declined")} className="w-6 h-6 rounded-lg bg-red-400/15 border border-red-400/25 flex items-center justify-center hover:bg-red-400/25 transition" title="Simular recusar">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Add input */}
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                value={inputValues[invite.id] || ""}
                                onChange={(e) => setInputValues((v) => ({ ...v, [invite.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") { addRecipient(invite.id, inputValues[invite.id] || ""); setInputValues((v) => ({ ...v, [invite.id]: "" })); } }}
                                placeholder="Nome do destinatário..."
                                className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/50 transition"
                              />
                              <button onClick={() => { addRecipient(invite.id, inputValues[invite.id] || ""); setInputValues((v) => ({ ...v, [invite.id]: "" })); }} className="w-9 h-9 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center hover:bg-[#2563eb]/30 transition flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              </button>
                              <button onClick={() => shareInvite(invite)} className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.09] transition flex-shrink-0" title="Compartilhar link">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/40"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                              </button>
                            </div>
                            <p className="text-[10px] text-white/20 px-1">Enter ou + para adicionar · ✓/✕ simulam a resposta do destinatário</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function TaskMatch() {
  // Estados persistidos — sobrevivem ao reload
  const [tasks,     setTasks]     = usePersistedState(SK.tasks,   [...INITIAL_TASKS]);
  const [stats,     setStats]     = usePersistedState(SK.stats,   { accepted: 0, rejected: 0, shared: 0 });
  const [invites,   setInvites]   = usePersistedState(SK.invites, []);
  const [profile,   setProfile]   = usePersistedState(SK.profile, { name: "Seu Nome", handle: "@taskmatch", avatar: "👤" });
  const [nextTaskId, setNextTaskId] = usePersistedState(SK.nextId, INITIAL_TASKS.length + 1);
  const [decisions, setDecisions] = usePersistedState(SK.decisions, []); // histórico imutável
  const [chatMessages, setChatMessages] = usePersistedState(SK.raf, [{ id: 1, sender: "raf", text: "RAF online. Fala o que precisa." }]);

  // Estados voláteis — resetam no reload (intencionalmente)
  const [toast,             setToast]             = useState({ visible: false, message: "", color: "" });
  const [activeTab,         setActiveTab]         = useState("home");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showAboutModal,    setShowAboutModal]    = useState(false);
  const [editedProfile,     setEditedProfile]     = useState(profile);
  const [isDesktop,         setIsDesktop]         = useState(window.innerWidth >= 1024);
  const [chatInput,         setChatInput]         = useState("");
  const [isChatLoading,     setIsChatLoading]     = useState(false);
  const [newTaskData,       setNewTaskData]       = useState({ title: "", description: "", category: "Alimentação", emoji: "✨" });
  const [swipeExit,         setSwipeExit]         = useState({ vx: 0, vy: 0, dir: null });
  const [showOnboarding,    setShowOnboarding]    = useState(() => !load("tm_onboarded", false));

  const chatEndRef = useRef(null);
  const profileEmojis = ["😎", "🚀", "⚡", "🎯", "🔥", "💡", "🧠", "✅", "🏆", "👾"];

  // total dinâmico — conta tasks iniciais + criadas pelo usuário
  const total = Math.max(INITIAL_TASKS.length, load(SK.nextId, INITIAL_TASKS.length + 1) - 1);
  const remaining = tasks.length;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const topTask = tasks[tasks.length - 1];
  const cardHeight = isDesktop ? 420 : 360;

  const quickActions = [
    { label: "Priorizar tarefas", prompt: "Me ajuda a priorizar minhas tarefas de hoje" },
    { label: "O que fazer agora?", prompt: "O que eu devo fazer agora?" },
    { label: "Criar tarefa", prompt: "Quero criar uma nova tarefa" },
  ];

  const rafSystemPrompt = `Você é o RAF (Rapid Action Filter), assistente de produtividade do app TaskMatch.
O app funciona com swipe de tarefas estilo Tinder: swipe right = fazer, swipe left = ignorar.
Personalidade: respostas curtas (máximo 2 frases), tom sarcástico e direto, sem bajulação, sem emojis, nunca comece com "Claro!" ou "Ótimo!".`;

  useEffect(() => { if (activeTab === "ia") chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, activeTab]);
  useEffect(() => { function h() { setIsDesktop(window.innerWidth >= 1024); } window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  function showToast(message, color) { setToast({ visible: true, message, color }); setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800); }

  function openProfileEditor() { setEditedProfile(profile); setShowProfileEditor(true); }
  function closeProfileEditor() { setShowProfileEditor(false); }
  function saveProfileEdits() {
    const name = editedProfile.name.trim() || profile.name;
    const rawHandle = editedProfile.handle.trim().replace(/^@+/, "");
    const handle = rawHandle ? `@${rawHandle}` : profile.handle;
    const updated = { ...profile, name, handle, avatar: editedProfile.avatar.trim() || profile.avatar };
    setProfile(updated);   // usePersistedState já persiste automaticamente
    setShowProfileEditor(false);
  }
  function handleLogout() { if (window.confirm("Deseja sair do TaskMatch?")) showToast("Logout não implementado.", "bg-red-600/90"); }

  function clearAllData() {
    if (!window.confirm("Apagar todos os dados? Tasks, histórico e convites serão removidos.")) return;
    Object.values(SK).forEach((key) => { try { localStorage.removeItem(key); } catch {} });
    setTasks([...INITIAL_TASKS]);
    setStats({ accepted: 0, rejected: 0, shared: 0 });
    setInvites([]);
    setDecisions([]);
    setNextTaskId(INITIAL_TASKS.length + 1);
    setChatMessages([{ id: 1, sender: "raf", text: "RAF online. Fala o que precisa." }]);
    showToast("Dados apagados.", "bg-red-600/90");
  }

  function createTaskFromOnboarding(formData) {
    const cat = ONBOARDING_GRADIENTS[formData.category] || { gradient: "from-sky-600 via-cyan-600 to-emerald-600", accent: "#22c55e" };
    setTasks(prev => [...prev, {
      id: nextTaskId,
      title: formData.title.trim(),
      description: formData.description?.trim() || "Sem descrição.",
      category: formData.category,
      emoji: formData.emoji?.trim() || "✨",
      gradient: cat.gradient,
      accent: cat.accent,
    }]);
    setNextTaskId(n => n + 1);
  }

  // ── Invite helpers ───────────────────────────────────────
  function addRecipient(inviteId, name) {
    if (!name.trim()) return;
    setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, recipients: [...inv.recipients, { id: Date.now(), name: name.trim(), status: "pending" }] } : inv));
  }
  function updateRecipientStatus(inviteId, recipientId, status) {
    setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, recipients: inv.recipients.map((r) => r.id === recipientId ? { ...r, status } : r) } : inv));
  }
  function shareInvite(invite) {
    const payload = {
      title: invite.title,
      description: invite.description,
      emoji: invite.emoji,
      category: invite.category,
      gradient: invite.gradient,
      accent: invite.accent || "#2563eb",
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `${window.location.origin}${window.location.pathname}#/invite/${encoded}`;
    if (navigator.share) {
      navigator.share({ title: `TaskMatch: ${invite.title}`, text: `Você foi convidado: "${invite.title}"`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      showToast("Link copiado!", "bg-emerald-600/90");
    }
  }

  // ── Swipe ────────────────────────────────────────────────
  async function handleSwipe(direction, task, vel = {}) {
    setSwipeExit({ vx: 0, vy: 0, ...vel, dir: direction });

    try { if (navigator.vibrate) {
      if (direction === "left")  navigator.vibrate(30);
      else if (direction === "right") navigator.vibrate([30, 50, 30]);
      else if (direction === "up")    navigator.vibrate(80);
    }} catch {}

    const deckWillEmpty = tasks.length === 1;
    const decision = {
      id: Date.now(),
      taskId: task.id,
      title: task.title,
      emoji: task.emoji,
      category: task.category,
      direction,
      decidedAt: new Date().toISOString(),
    };

    if (direction === "right") {
      setStats((s) => ({ ...s, accepted: s.accepted + 1 }));
      setDecisions((prev) => [{ ...decision, label: "Aceito" }, ...prev].slice(0, 200));
      showToast("✓  Aceito!", "bg-emerald-600/90 backdrop-blur-md");
    } else if (direction === "left") {
      setStats((s) => ({ ...s, rejected: s.rejected + 1 }));
      setDecisions((prev) => [{ ...decision, label: "Depois" }, ...prev].slice(0, 200));
      showToast("×  Deixado pra depois", "bg-red-600/90 backdrop-blur-md");
    } else if (direction === "up") {
      setStats((s) => ({ ...s, shared: s.shared + 1 }));
      setDecisions((prev) => [{ ...decision, label: "Delegado" }, ...prev].slice(0, 200));
      const newInvite = {
        id: `inv-${Date.now()}`,
        taskId: task.id,
        title: task.title,
        description: task.description,
        emoji: task.emoji,
        category: task.category,
        gradient: task.gradient,
        accent: task.accent || "#2563eb",
        sentAt: new Date().toISOString(),
        recipients: [],
      };
      setInvites((prev) => [newInvite, ...prev]);
      showToast("↑  Convite criado!", "bg-blue-600/90 backdrop-blur-md");
      setActiveTab("explore");
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    if (deckWillEmpty) {
      try {
        const colors = ["#2563eb", "#34d399", "#f59e0b"];
        const end = Date.now() + 2500;
        (function shoot() {
          confetti({ particleCount: 5, spread: 70, origin: { x: 0.3, y: 0.6 }, colors });
          confetti({ particleCount: 5, spread: 70, origin: { x: 0.7, y: 0.6 }, colors });
          if (Date.now() < end) requestAnimationFrame(shoot);
        })();
      } catch {}
    }
  }

  function handleReset() {
    setTasks([...INITIAL_TASKS]);
    setStats({ accepted: 0, rejected: 0, shared: 0 });
    setNextTaskId(INITIAL_TASKS.length + 1);
    // invites e decisions são preservados intencionalmente no reset
  }

  // ── RAF ──────────────────────────────────────────────────
  async function sendUserMessage(text) {
    if (!text || isChatLoading) return;
    const userMessage = { id: Date.now(), sender: "user", text };
    const nextMessages = [...chatMessages, userMessage].slice(-50);
    setChatMessages(nextMessages); setChatInput(""); setIsChatLoading(true);
    if (!tasks.length) { setChatMessages((p) => [...p, { id: Date.now() + 1, sender: "raf", text: "Deck vazio. Cria alguma coisa pra fazer sentido usar o app." }].slice(-50)); setIsChatLoading(false); return; }
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) { setChatMessages((p) => [...p, { id: Date.now() + 1, sender: "raf", text: "API key não configurada. Configure VITE_OPENAI_API_KEY." }].slice(-50)); setIsChatLoading(false); return; }
    try {
      const deckContext = tasks.map((t) => `"${t.title}"`).join(", ");
      const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: rafSystemPrompt }, ...nextMessages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })), { role: "user", content: `[Deck: ${deckContext}]\n${text}` }], max_tokens: 120, temperature: 0.75 }) });
      const result = await response.json();
      const answer = result?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error("Resposta inválida");
      setChatMessages((p) => [...p, { id: Date.now() + 2, sender: "raf", text: answer }].slice(-50));
    } catch { setChatMessages((p) => [...p, { id: Date.now() + 2, sender: "raf", text: "Não foi possível conectar ao RAF agora. Tente novamente." }].slice(-50)); }
    finally { setIsChatLoading(false); }
  }
  function handleSendMessage(e) { e.preventDefault(); sendUserMessage(chatInput.trim()); }
  function handleQuickAction(prompt) { sendUserMessage(prompt); }

  // ── Shared sub-sections ──────────────────────────────────
  const showQuickActions = chatInput.trim() === "";

  const NavItems = [
    { id: "home",    label: "Início",   icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "explore", label: "Explorar", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" },
    { id: "ia",      label: "RAF",       icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { id: "profile", label: "Perfil",    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  // ── Modals (shared) ──────────────────────────────────────
  const ProfileEditorModal = ({ isMobile }) => (
    <div className={`fixed inset-0 z-50 flex bg-black/60 px-4 ${isMobile ? "items-end pb-6" : "items-center justify-center"}`}>
      <div className="w-full max-w-md rounded-[28px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold text-white">Editar perfil</div><div className="text-[12px] text-white/40">Atualize nome, nick e emoji.</div></div><button type="button" onClick={closeProfileEditor} className="text-white/40 hover:text-white text-lg">✕</button></div>
        <div className="flex justify-center mb-4"><div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 text-4xl flex items-center justify-center">{editedProfile.avatar}</div></div>
        <div className="space-y-3 mb-4">
          <input value={editedProfile.name} onChange={(e) => setEditedProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Seu nome" className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]" />
          <input value={editedProfile.handle} onChange={(e) => setEditedProfile((p) => ({ ...p, handle: e.target.value }))} placeholder="@nick" className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]" />
        </div>
        <div className="grid grid-cols-5 gap-2 mb-4">{profileEmojis.map((emoji) => (<button key={emoji} type="button" onClick={() => setEditedProfile((p) => ({ ...p, avatar: emoji }))} className={`rounded-xl p-2.5 text-lg transition ${editedProfile.avatar === emoji ? "border border-[#2563eb] bg-[#2563eb]/20" : "bg-white/[0.04]"}`}>{emoji}</button>))}</div>
        <div className="flex gap-3"><button type="button" onClick={closeProfileEditor} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/70">Cancelar</button><button type="button" onClick={saveProfileEdits} className="flex-1 rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white">Salvar</button></div>
      </div>
    </div>
  );

  const AboutModal = ({ isMobile }) => (
    <div className={`fixed inset-0 z-50 flex bg-black/60 px-4 ${isMobile ? "items-end pb-6" : "items-center justify-center"}`}>
      <div className="w-full max-w-sm rounded-[28px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold text-white">Sobre o TaskMatch</div><div className="text-[12px] text-white/40">Informações do app</div></div><button type="button" onClick={() => setShowAboutModal(false)} className="text-white/40 hover:text-white text-lg">✕</button></div>
        <div className="space-y-3 text-sm text-white/60 mb-5"><div><div className="text-white font-semibold">TaskMatch</div><div className="text-[12px] text-white/35">Versão 0.0.0</div></div><p>App dark minimalista para tomar decisões rápidas e organizar seu dia com foco em ação.</p></div>
        <button type="button" onClick={() => setShowAboutModal(false)} className="w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white">Fechar</button>
      </div>
    </div>
  );

  // ── Profile section (shared content) ────────────────────
  const ProfileContent = ({ isMobile }) => (
    <>
      <div className="flex flex-col items-center gap-2 mb-6">
        <button type="button" onClick={openProfileEditor} className="relative w-20 h-20 rounded-full bg-white/[0.06] border border-white/10 text-5xl flex items-center justify-center hover:bg-white/10 transition">
          {profile.avatar}
          <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#111114] border border-white/10 text-[13px] flex items-center justify-center">✏️</span>
        </button>
        <div className="text-center"><div className="text-lg font-semibold text-white">{profile.name}</div><div className="text-[13px] text-white/35 mt-0.5">{profile.handle}</div></div>
        {!isMobile && <div className="flex gap-2"><span className="text-[11px] font-semibold bg-[#2563eb]/15 text-[#93c5fd] px-3 py-1 rounded-full">Nível 7</span><span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full">5 dias</span></div>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[{ label: "Feitas", value: stats.accepted + stats.rejected + stats.shared, color: "text-[#2563eb]" }, { label: "Sequência", value: 5, color: "text-amber-400" }, { label: "Taxa", value: stats.accepted + stats.rejected + stats.shared > 0 ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%` : "0%", color: "text-emerald-400" }].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3"><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-[11px] text-white/35 mt-0.5">{label}</div></div>
        ))}
      </div>
      <div className={`rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden ${isMobile ? "" : "rounded-3xl"}`}>
        {[{ label: "Editar perfil", action: openProfileEditor, icon: "👤" }, { label: "Notificações", action: () => showToast("Em breve.", "bg-white/10"), icon: "🔔" }, { label: "Aparência", action: () => showToast("Em breve.", "bg-white/10"), icon: "🎨" }, { label: "Sobre o TaskMatch", action: () => setShowAboutModal(true), icon: "ℹ️" }].map(({ label, action, icon }, i) => (
          <button key={label} type="button" onClick={action} className={`flex w-full items-center gap-3 px-4 py-4 text-left text-white hover:bg-white/[0.05] transition ${i > 0 ? "border-t border-white/[0.05]" : ""}`}><span className="text-[17px] text-white/40">{icon}</span><span className="flex-1 text-sm">{label}</span><span className="text-white/20 text-lg">›</span></button>
        ))}
        <button type="button" onClick={clearAllData} className="flex w-full items-center gap-3 px-4 py-4 text-left border-t border-white/[0.05] hover:bg-amber-500/10 transition">
          <span className="text-[17px]">🗑️</span><span className="flex-1 text-sm text-amber-300">Limpar todos os dados</span><span className="text-amber-400/40 text-lg">›</span>
        </button>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-4 text-left border-t border-white/[0.05] hover:bg-red-500/10 transition"><span className="text-[17px]">🚪</span><span className="flex-1 text-sm text-red-300">Sair</span><span className="text-red-400/40 text-lg">›</span></button>
      </div>
      {showProfileEditor && <ProfileEditorModal isMobile={isMobile} />}
      {showAboutModal && <AboutModal isMobile={isMobile} />}
    </>
  );

  // ── RAF content (shared) ─────────────────────────────────
  const RafContent = ({ isMobile }) => (
    <motion.div className="flex flex-col h-full" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className={`flex-shrink-0 border-b border-white/[0.05] ${isMobile ? "px-5 pt-4 pb-3" : "px-10 pt-7 pb-4"}`}>
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-0.5">Assistente</p>
        <h2 className={`font-bold text-white ${isMobile ? "text-base" : "text-lg"}`}>⚡ RAF</h2>
      </div>
      <div className={`flex-1 min-h-0 overflow-y-auto py-4 ${isMobile ? "px-5" : "px-10"}`} style={{ WebkitOverflowScrolling: "touch" }}>
        <div className={`space-y-2.5 pb-2 ${isMobile ? "" : "max-w-xl mx-auto"}`}>
          {chatMessages.map((message, index) => {
            const isUser = message.sender === "user";
            const previous = chatMessages[index - 1];
            const showIcon = !isUser && (!previous || previous.sender !== "raf");
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-1.5 ${isUser ? "ml-auto" : "mr-auto"}`}>
                  {!isUser && showIcon && <div className="mt-1 text-[13px] text-white/40 flex-shrink-0">⚡</div>}
                  {!isUser && !showIcon && <div className="w-[19px] flex-shrink-0" />}
                  <div className={`${isMobile ? "max-w-[78%]" : "max-w-[480px]"} rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? "bg-[#2563eb] text-white rounded-br-[4px]" : "bg-white/[0.07] text-white/80 rounded-bl-[4px]"}`}>{message.text}</div>
                </div>
              </div>
            );
          })}
          {isChatLoading && <div className="flex justify-start"><div className="flex items-start gap-1.5"><div className="mt-1 text-[13px] text-white/40">⚡</div><div className="bg-white/[0.07] rounded-2xl rounded-bl-[4px] px-4 py-2.5"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" /><span className="w-2 h-2 rounded-full bg-white/50 animate-pulse delay-150" /><span className="w-2 h-2 rounded-full bg-white/50 animate-pulse delay-300" /></div></div></div></div>}
          <div ref={chatEndRef} />
        </div>
      </div>
      <AnimatePresence>
        {showQuickActions && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-shrink-0 overflow-hidden">
            <div className={`flex items-center gap-2 py-2 overflow-x-auto ${isMobile ? "px-5" : "px-10"}`} style={{ scrollbarWidth: "none" }}>
              {quickActions.map((action) => (<button key={action.prompt} type="button" onClick={() => handleQuickAction(action.prompt)} className="whitespace-nowrap flex-shrink-0 rounded-full border border-white/[0.12] bg-transparent px-4 py-2 text-[13px] text-white/50 hover:border-white/25 hover:text-white/75 transition">{action.label}</button>))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`flex-shrink-0 pt-2 bg-[#111114] ${isMobile ? "px-4 pb-3" : "px-10 pb-8"}`}>
        <div className={isMobile ? "" : "max-w-xl mx-auto"}>
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-3 py-2">
            <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} placeholder="Mensagem..." disabled={isChatLoading} rows={1} className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50" />
            <button type="submit" disabled={isChatLoading || chatInput.trim() === ""} className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${chatInput.trim() === "" ? "bg-white/10 text-white/30" : "bg-[#2563eb] text-white"}`}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M13 4l7 6-7 6" /></svg>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );

  const CreateContent = ({ isMobile }) => (
    <motion.div className={`h-full overflow-y-auto ${isMobile ? "px-5 pt-4 pb-6" : "px-10 py-10"}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className={isMobile ? "" : "max-w-xl mx-auto"}>
        <div className={`flex items-center justify-between ${isMobile ? "mb-5" : "mb-6"}`}>
          <div><p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Nova tarefa</p><h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-xl"}`}>Criar card</h2></div>
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar</button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!newTaskData.title.trim() || !newTaskData.description.trim()) { showToast("Preencha título e descrição.", "bg-red-600/90"); return; }
          const newTask = {
            id: nextTaskId,
            title: newTaskData.title.trim(),
            description: newTaskData.description.trim(),
            category: newTaskData.category,
            emoji: newTaskData.emoji || "✨",
            gradient: "from-sky-600 via-cyan-600 to-emerald-600",
            accent: "#22c55e",
          };
          setTasks((prev) => [...prev, newTask]);
          setNextTaskId((id) => id + 1);
          setNewTaskData({ title: "", description: "", category: "Alimentação", emoji: "✨" });
          showToast("Tarefa criada!", "bg-emerald-600/90");
          setActiveTab("home");
        }} className={`${isMobile ? "flex flex-col gap-4" : "rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col gap-5"}`}>
          <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Título</label><input value={newTaskData.title} onChange={(e) => setNewTaskData((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition" placeholder="Ex: Comprar mantimentos" /></div>
          <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Descrição</label><textarea value={newTaskData.description} onChange={(e) => setNewTaskData((p) => ({ ...p, description: e.target.value }))} className="w-full min-h-[100px] rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 resize-none transition" placeholder="Detalhes da tarefa..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Categoria</label><select value={newTaskData.category} onChange={(e) => setNewTaskData((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60">{["Alimentação","Lazer","Saúde","Estudos","Trabalho","Outros"].map((c) => (<option key={c} value={c} className="bg-[#111114]">{c}</option>))}</select></div>
            <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Emoji</label><input value={newTaskData.emoji} onChange={(e) => setNewTaskData((p) => ({ ...p, emoji: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition" placeholder="✨" /></div>
          </div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={() => setActiveTab("home")} className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm text-white/50 hover:bg-white/[0.07] hover:text-white/70 transition">Cancelar</button><button type="submit" className="flex-1 rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition">Adicionar tarefa</button></div>
        </form>
      </div>
    </motion.div>
  );

  // ════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen w-full bg-[#111114]">

      {/* ── MOBILE ── */}
      {!isDesktop && (
        <div className="flex flex-col w-full h-screen bg-[#111114] overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3 bg-[#111114]">
            <div><h1 className="text-[22px] font-black tracking-tight leading-none text-white">Task<span style={{ color: "#2563eb" }}>Match</span></h1><p className="text-[11px] text-white/30 mt-0.5">Decida rápido, viva mais.</p></div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-2xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/40"><path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button>
              <button onClick={() => setActiveTab("create")} className="w-9 h-9 rounded-2xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            </div>
          </div>

          {activeTab === "home" && remaining > 0 && (
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] text-white/30 font-medium">Deck pessoal</span><span className="text-[11px] text-white/20 bg-white/[0.05] px-2.5 py-0.5 rounded-full">{remaining} de {total} restantes</span></div>
              <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-[#2563eb] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden relative">
            {activeTab === "home" && (
              <div className="flex flex-col h-full">
                {remaining > 0 ? (
                  <>
                    <div className="flex-1 min-h-0 px-5 pt-2 pb-2 relative"><div className="relative w-full h-full"><AnimatePresence custom={swipeExit}>{tasks.slice(-3).reverse().map((task, i, arr) => { const isTop = i === 0; const stackIndex = arr.length - 1 - i; return (<SwipeCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleSwipe} />); })}</AnimatePresence></div></div>
                    <div className="flex-shrink-0 flex items-center justify-between px-8 py-2">
                      <div className="flex items-center gap-1.5 text-red-400/45"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg><span className="text-[9px] font-semibold tracking-widest uppercase">Depois</span></div>
                      <div className="flex flex-col items-center text-blue-400/45"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mb-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg><span className="text-[9px] font-semibold tracking-widest uppercase">Delegar</span></div>
                      <div className="flex items-center gap-1.5 text-emerald-400/45"><span className="text-[9px] font-semibold tracking-widest uppercase">Aceitar</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></div>
                    </div>
                    <div className="flex-shrink-0 flex items-center justify-center pb-4"><ActionButtons onAction={(dir) => topTask && handleSwipe(dir, topTask)} disabled={!topTask} /></div>
                  </>
                ) : (<EmptyState stats={stats} onReset={handleReset} />)}
              </div>
            )}
            {activeTab === "explore" && <ExploreTab invites={invites} addRecipient={addRecipient} updateRecipientStatus={updateRecipientStatus} shareInvite={shareInvite} isMobile={true} />}
            {activeTab === "ia" && <RafContent isMobile={true} />}
            {activeTab === "create" && <CreateContent isMobile={true} />}
            {activeTab === "profile" && (
              <motion.div className="h-full overflow-y-auto px-5 pt-4 pb-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <ProfileContent isMobile={true} />
              </motion.div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center border-t border-white/[0.06] bg-[#111114]" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}>
            {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center gap-1 py-3"><svg viewBox="0 0 24 24" fill="none" stroke={isActive ? "#3b82f6" : "rgba(255,255,255,0.22)"} strokeWidth={isActive ? 2.2 : 1.8} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg><span className="text-[10px] font-medium" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.2)" }}>{tab.label}</span></button>); })}
          </div>
        </div>
      )}

      {/* ── DESKTOP ── */}
      {isDesktop && (
        <div className="w-full h-screen flex bg-[#111114]">
          <aside className="w-[220px] flex-shrink-0 bg-[#18181c] flex flex-col px-4 py-6 border-r border-white/[0.05]">
            <div className="mb-6 px-2"><h1 className="text-xl font-black tracking-tight leading-none text-white">Task<span style={{ color: "#2563eb" }}>Match</span></h1><p className="text-[11px] text-white/30 mt-1">Decida rápido, viva mais.</p></div>
            <nav className="flex flex-col gap-0.5">
              {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? "bg-[#2563eb]/15 text-[#93c5fd]" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className="w-[17px] h-[17px] flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg><span className="text-[13px] font-medium">{tab.label}</span></button>); })}
            </nav>
            <div className="mt-auto pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/25 mb-1">Sessão atual</p>
              {[{ label: "Aceitas", value: stats.accepted, color: "text-emerald-400" }, { label: "Delegadas", value: stats.shared, color: "text-blue-400" }, { label: "Depois", value: stats.rejected, color: "text-red-400" }].map(({ label, value, color }) => (<div key={label} className="flex items-center justify-between"><span className="text-[12px] text-white/40">{label}</span><AnimatePresence mode="wait"><motion.span key={value} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={`text-[14px] font-semibold ${color}`}>{value}</motion.span></AnimatePresence></div>))}
              <div className="flex items-center justify-between mt-1"><span className="text-[12px] text-white/40">Taxa de aceite</span><span className="text-[13px] font-semibold text-emerald-400">{stats.accepted + stats.rejected + stats.shared > 0 ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%` : "—"}</span></div>
              <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden mt-0.5"><motion.div className="h-full bg-[#2563eb] rounded-full" animate={{ width: stats.accepted + stats.rejected + stats.shared > 0 ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%` : "0%" }} transition={{ type: "spring", stiffness: 100, damping: 20 }} /></div>
            </div>
          </aside>

          <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {activeTab === "home" && (
              <>
                <div className="flex items-center justify-between px-10 pt-6 pb-3 flex-shrink-0 border-b border-white/[0.05]">
                  <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-white/30">Deck pessoal</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/20 bg-white/[0.05] px-3 py-1 rounded-full">{remaining} de {total} restantes</span>
                    <button onClick={() => setActiveTab("create")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[12px] font-medium text-[#3b82f6] hover:bg-[#2563eb]/30 transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Criar card</button>
                  </div>
                </div>
                {remaining > 0 && (<div className="px-10 pt-3 pb-1 flex-shrink-0"><div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-[#2563eb] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div></div>)}
                <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-6 min-h-0">
                  {remaining > 0 ? (
                    <>
                      <div className="relative w-full max-w-[520px]" style={{ height: cardHeight }}><AnimatePresence custom={swipeExit}>{tasks.slice(-3).reverse().map((task, i, arr) => { const isTop = i === 0; const stackIndex = arr.length - 1 - i; return (<SwipeCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleSwipe} />); })}</AnimatePresence></div>
                      <div className="flex items-center justify-between w-full max-w-[520px] px-2">
                        <div className="flex items-center gap-1.5 text-red-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg><span className="text-[10px] font-semibold tracking-widest uppercase">Depois</span></div>
                        <div className="flex flex-col items-center text-blue-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 mb-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg><span className="text-[10px] font-semibold tracking-widest uppercase">Delegar</span></div>
                        <div className="flex items-center gap-1.5 text-emerald-400/50"><span className="text-[10px] font-semibold tracking-widest uppercase">Aceitar</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></div>
                      </div>
                      <ActionButtons onAction={(dir) => topTask && handleSwipe(dir, topTask)} disabled={!topTask} />
                    </>
                  ) : (<EmptyState stats={stats} onReset={handleReset} />)}
                </div>
              </>
            )}
            {activeTab === "explore" && <ExploreTab invites={invites} addRecipient={addRecipient} updateRecipientStatus={updateRecipientStatus} shareInvite={shareInvite} isMobile={false} />}
            {activeTab === "ia" && <RafContent isMobile={false} />}
            {activeTab === "create" && <CreateContent isMobile={false} />}
            {activeTab === "profile" && (
              <motion.div className="flex flex-1 flex-col items-center overflow-y-auto px-10 py-10" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-full max-w-xl"><ProfileContent isMobile={false} /></div>
              </motion.div>
            )}
          </main>
        </div>
      )}

      {showOnboarding && (
        <Onboarding
          onFinish={() => { save("tm_onboarded", true); setShowOnboarding(false); }}
          onCreateTask={createTaskFromOnboarding}
        />
      )}

      <Toast visible={toast.visible} message={toast.message} color={toast.color} />
    </div>
  );
}