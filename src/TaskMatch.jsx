import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

// ── Storage keys ─────────────────────────────────────────────
const SK = {
  tasks:         "tm_tasks",
  stats:         "tm_stats",
  invites:       "tm_invites",
  profile:       "tm_profile",
  nextId:        "tm_next_id",
  raf:           "taskmatch_raf_history",
  decisions:     "tm_decisions",  // histórico imutável de swipes
  exploreSeenAt: "tm_explore_seen_at",
  streak:        "tm_streak",
};
const SK_GROUP_NICK = "tm_group_nick";

// ── Date helpers ──────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00"), d2 = new Date(b + "T00:00:00");
  return Math.round((d2 - d1) / 86400000);
}
function getWeekDots(streak) {
  const today = todayKey();
  const dots = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dots.push(d.toISOString().slice(0, 10));
  }
  if (!streak.lastActiveDate) return dots.map(d => ({ date: d, active: false, isToday: d === today }));
  const activeDates = new Set();
  for (let i = 0; i < streak.count; i++) {
    const d = new Date(streak.lastActiveDate + "T00:00:00"); d.setDate(d.getDate() - i);
    activeDates.add(d.toISOString().slice(0, 10));
  }
  return dots.map(d => ({ date: d, active: activeDates.has(d), isToday: d === today }));
}

// ── Group deck helpers ────────────────────────────────────────
const GROUP_AVATARS = ["😎","🚀","🎯","🔥","💡","🎉","🌟","🎸","🦊","🐼","🍕","🎮","⚡","🏆","🎪","🌈"];

const GROUP_GRADIENT_OPTIONS = [
  { gradient: "from-violet-600 via-purple-700 to-indigo-800", accent: "#8b5cf6" },
  { gradient: "from-rose-600 via-pink-600 to-red-700",        accent: "#f43f5e" },
  { gradient: "from-amber-500 via-orange-600 to-red-600",     accent: "#f59e0b" },
  { gradient: "from-emerald-600 via-teal-600 to-cyan-700",    accent: "#10b981" },
  { gradient: "from-blue-600 via-sky-500 to-cyan-600",        accent: "#3b82f6" },
  { gradient: "from-slate-500 via-gray-600 to-zinc-700",      accent: "#94a3b8" },
];

function encodeGroupDeck(deck) {
  return btoa(encodeURIComponent(JSON.stringify(deck)));
}
function decodeGroupDeck(b64) {
  try { return JSON.parse(decodeURIComponent(atob(b64))); } catch { return null; }
}
function buildGroupUrl(deck) {
  return `${window.location.origin}${window.location.pathname}?d=${encodeGroupDeck(deck)}`;
}

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

function computeUnreadCount(invites, lastSeenAt) {
  let count = 0;
  for (const invite of invites) {
    for (const r of invite.recipients) {
      if (r.status === "pending") continue;
      if (lastSeenAt === null || (r.updatedAt && r.updatedAt > lastSeenAt)) count++;
    }
  }
  return count;
}

const INITIAL_TASKS = [
  { id: 1, title: "Pedir Pizza", description: "Todo mundo tá com fome. Escolher sabores e fazer o pedido até às 19h.", category: "Alimentação", emoji: "🍕", gradient: "from-orange-600 via-red-600 to-rose-700", accent: "#f97316", priority: null, deadline: null, image: null },
  { id: 2, title: "Ver Filme", description: "Dune: Parte 2 ou Oppenheimer? Alguém escolhe, a gente vai junto.", category: "Lazer", emoji: "🎬", gradient: "from-violet-700 via-purple-700 to-indigo-800", accent: "#8b5cf6", priority: null, deadline: null, image: null },
  { id: 3, title: "Academia", description: "Treino de pernas marcado pra terça às 7h. Confirmar presença.", category: "Saúde", emoji: "💪", gradient: "from-emerald-600 via-teal-600 to-cyan-700", accent: "#10b981", priority: null, deadline: null, image: null },
  { id: 4, title: "Estudar IHC", description: "Revisar heurísticas de Nielsen antes da apresentação de quinta.", category: "Estudos", emoji: "📖", gradient: "from-blue-600 via-sky-600 to-cyan-600", accent: "#3b82f6", priority: null, deadline: null, image: null },
  { id: 5, title: "Reunião de Equipe", description: "Sprint planning semanal. Preparar card de bloqueios e progresso.", category: "Trabalho", emoji: "🗓️", gradient: "from-amber-600 via-yellow-600 to-orange-500", accent: "#f59e0b", priority: null, deadline: null, image: null },
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

// ── Urgency helpers ──────────────────────────────────────────
const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

function sortByUrgency(tasks) {
  const now = new Date();
  return [...tasks].sort((a, b) => {
    const aOver = a.deadline && new Date(a.deadline + "T23:59:59") < now;
    const bOver = b.deadline && new Date(b.deadline + "T23:59:59") < now;
    if (aOver !== bOver) return aOver ? 1 : -1; // overdue → end of array (top of deck)
    const ap = PRIORITY_ORDER[a.priority] || 0;
    const bp = PRIORITY_ORDER[b.priority] || 0;
    if (ap !== bp) return ap - bp; // higher priority → end → top
    if (a.deadline && b.deadline) return new Date(b.deadline) - new Date(a.deadline); // earlier deadline → end
    if (a.deadline && !b.deadline) return 1;
    if (!a.deadline && b.deadline) return -1;
    return 0;
  });
}

function deadlineBadge(deadline) {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + "T00:00:00");
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)  return { label: "Atrasado", overdue: true };
  if (diff === 0) return { label: "Hoje",    overdue: false };
  if (diff === 1) return { label: "Amanhã",  overdue: false };
  return { label: `Em ${diff} dias`, overdue: false };
}

// ── Canvas / share helpers ────────────────────────────────────
const TW_COLORS = {
  "slate-400":"#94a3b8","slate-500":"#64748b","slate-600":"#475569","slate-700":"#334155",
  "gray-500":"#6b7280","gray-600":"#4b5563","gray-700":"#374151",
  "zinc-600":"#52525b","zinc-700":"#3f3f46",
  "red-500":"#ef4444","red-600":"#dc2626","red-700":"#b91c1c",
  "orange-500":"#f97316","orange-600":"#ea580c","orange-700":"#c2410c",
  "amber-500":"#f59e0b","amber-600":"#d97706","amber-700":"#b45309",
  "yellow-500":"#eab308","yellow-600":"#ca8a04",
  "rose-500":"#f43f5e","rose-600":"#e11d48","rose-700":"#be123c",
  "pink-500":"#ec4899","pink-600":"#db2777","pink-700":"#be185d",
  "emerald-500":"#10b981","emerald-600":"#059669","emerald-700":"#047857",
  "teal-500":"#14b8a6","teal-600":"#0d9488","teal-700":"#0f766e",
  "cyan-500":"#06b6d4","cyan-600":"#0891b2","cyan-700":"#0e7490",
  "sky-500":"#0ea5e9","sky-600":"#0284c7","sky-700":"#0369a1",
  "blue-500":"#3b82f6","blue-600":"#2563eb","blue-700":"#1d4ed8",
  "indigo-600":"#4f46e5","indigo-700":"#4338ca","indigo-800":"#3730a3",
  "violet-600":"#7c3aed","violet-700":"#6d28d9",
  "purple-500":"#a855f7","purple-600":"#9333ea","purple-700":"#7e22ce",
  "fuchsia-600":"#c026d3","fuchsia-700":"#a21caf",
  "lime-600":"#65a30d","lime-700":"#4d7c0f",
  "green-500":"#22c55e","green-600":"#16a34a","green-700":"#15803d",
};
function parseTailwindGradient(str) {
  const from = (str.match(/from-([^\s]+)/) || [])[1];
  const via  = (str.match(/via-([^\s]+)/)  || [])[1];
  const to   = (str.match(/to-([^\s]+)/)   || [])[1];
  const c0 = TW_COLORS[from] || "#2563eb";
  const c2 = TW_COLORS[to]   || "#1e3a8a";
  const c1 = TW_COLORS[via];
  return c1 ? [c0, c1, c2] : [c0, c2];
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function wrapText(ctx, text, x, y, maxWidth, lineH, maxLines = 8) {
  const words = text.split(" ");
  let line = "", lines = [];
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim()); line = word + " ";
      if (lines.length >= maxLines - 1) break;
    } else { line = test; }
  }
  if (line.trim()) lines.push(line.trim());
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length;
}
async function drawTaskCard(canvas, task, format = "square", handle = "") {
  const isStory = format === "story";
  const W = 1080, H = isStory ? 1920 : 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();
  const stops = parseTailwindGradient(task.gradient || "");
  const bg = ctx.createLinearGradient(0, 0, W * 0.7, H);
  bg.addColorStop(0, stops[0]);
  if (stops[2]) { bg.addColorStop(0.5, stops[1]); bg.addColorStop(1, stops[2]); }
  else { bg.addColorStop(1, stops[1] || stops[0]); }
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const scrim = ctx.createLinearGradient(0, H * 0.3, 0, H);
  scrim.addColorStop(0, "rgba(0,0,0,0)"); scrim.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = scrim; ctx.fillRect(0, H * 0.3, W, H * 0.7);
  ctx.restore();
  const pad = 80;
  const cat = (task.category || "").toUpperCase();
  ctx.font = "600 30px system-ui,-apple-system,sans-serif";
  ctx.textAlign = "left";
  const bw = Math.min(ctx.measureText(cat).width + 56, W - pad * 2);
  ctx.save();
  roundRectPath(ctx, pad, pad, bw, 58, 29);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillText(cat, pad + 28, pad + 38);
  const emojiSz = isStory ? 180 : 160;
  ctx.font = `${emojiSz}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(task.emoji || "✨", W / 2, isStory ? H * 0.31 : H * 0.36);
  const titleSz = isStory ? 92 : 80;
  ctx.font = `800 ${titleSz}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 18;
  const titleY = isStory ? H * 0.49 : H * 0.55;
  const nLines = wrapText(ctx, task.title || "", W / 2, titleY, W - pad * 2.4, titleSz * 1.22, 3);
  ctx.shadowBlur = 0;
  if (task.description) {
    const descSz = isStory ? 50 : 44;
    ctx.font = `400 ${descSz}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 6;
    wrapText(ctx, task.description, W / 2, titleY + nLines * titleSz * 1.22 + (isStory ? 60 : 50), W - pad * 3.2, descSz * 1.42, 4);
    ctx.shadowBlur = 0;
  }
  ctx.font = `500 ${isStory ? 42 : 36}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.textAlign = "center";
  ctx.fillText(handle ? `TaskMatch  ·  ${handle}` : "TaskMatch", W / 2, H - (isStory ? 90 : 70));
}
function decisionToShareTask(d) {
  const g = ONBOARDING_GRADIENTS[d.category] || { gradient: "from-blue-600 via-sky-600 to-cyan-600", accent: "#2563eb" };
  return { title: d.title, description: "", category: d.category, emoji: d.emoji, gradient: g.gradient, accent: g.accent };
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── SwipeCard ────────────────────────────────────────────────
function SwipeCard({ task, onSwipe, isTop, stackIndex, onShare }) {
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
        <div className="absolute top-5 left-5 z-10"><span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">{task.category}</span></div>
        <div className="absolute top-5 right-5 z-10 text-4xl filter drop-shadow-lg">{task.emoji}</div>
        {onShare && (
          <button className="absolute top-[60px] right-5 z-40 w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/55 transition" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onShare(task); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5 leading-tight">{task.title}</h2>
          {task.deadline && (() => { const b = deadlineBadge(task.deadline); return b ? (
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${b.overdue ? "bg-red-500/30 text-red-200 animate-pulse" : "bg-black/25 text-white/70"}`}>{b.overdue ? "⚠️" : "🗓"} {b.label}</span>
          ) : null; })()}
          <p className="text-sm text-white/70 leading-relaxed">{task.description}</p>
        </div>
        {task.priority && (
          <div className="absolute bottom-6 right-6 z-10">
            <span className="text-[10px] font-semibold bg-black/30 backdrop-blur-sm text-white/80 px-2.5 py-1 rounded-full border border-white/10">
              {task.priority === "high" ? "🔴 Alta" : task.priority === "medium" ? "🟡 Média" : "🟢 Baixa"}
            </span>
          </div>
        )}
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
// ── NavBadge ──────────────────────────────────────────────────
function NavBadge({ count }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="nb"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-[3px] leading-none pointer-events-none"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

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

// ── GroupTaskCard ─────────────────────────────────────────────
function GroupTaskCard({ task, onSwipe, isTop, stackIndex }) {
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

  if (!isTop) {
    const ts = 1 - stackIndex * 0.04;
    const ty = stackIndex * 12;
    const to = 1 - stackIndex * 0.15;
    return (
      <motion.div className="absolute inset-0 mx-auto" initial={{ scale: ts, y: ty, opacity: to }} animate={{ scale: ts, y: ty, opacity: to }} transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.8 }} style={{ zIndex: 10 - stackIndex, width: "100%", originY: 1 }}>
        <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient} shadow-2xl`} />
      </motion.div>
    );
  }

  return (
    <motion.div className="absolute inset-0 mx-auto cursor-grab active:cursor-grabbing" style={{ x, y, rotateZ, zIndex: 20, width: "100%" }} drag dragConstraints={{ top: -300, bottom: 150, left: -300, right: 300 }} dragElastic={0.12} onDragEnd={handleDragEnd} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileDrag={{ scale: 0.97, filter: "drop-shadow(0 24px 52px rgba(0,0,0,0.6))" }} variants={{ exit: ({ vx = 0, vy = 0, dir } = {}) => { const cx = x.get(); const cy = y.get(); if (dir === "up") return { y: -700, x: cx * 1.5, rotate: cx * 0.05, opacity: 0, transition: { duration: 0.42, ease: [0.4, 0, 1, 1] } }; const sign = dir === "right" ? 1 : -1; const exitDur = Math.max(0.26, 0.38 - Math.min(Math.abs(vx), 1200) / 5000); return { x: sign * 720, y: cy + 80, rotate: sign * Math.min(Math.abs(vx) / 160, 20), opacity: 0, transition: { duration: exitDur, ease: [0.4, 0, 1, 1] } }; } }} exit="exit">
      <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient} overflow-hidden shadow-2xl relative select-none`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-6 right-6 z-10 text-6xl filter drop-shadow-lg">{task.emoji}</div>
        <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
          <h2 className="text-3xl font-black text-white tracking-tight leading-tight">{task.title}</h2>
        </div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(22,163,74,0.55)", opacity: greenOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[-20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Topo!</span></div></motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(220,38,38,0.55)", opacity: redOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Passo</span></div></motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(168,85,247,0.6)", opacity: blueOpacity }}><div className="border-[3px] border-white/90 rounded-xl px-5 py-2"><span className="text-white font-black text-2xl tracking-widest uppercase">Amo essa ↑</span></div></motion.div>
      </div>
    </motion.div>
  );
}

// ── CreateGroupModal ──────────────────────────────────────────
function CreateGroupModal({ onClose, createdBy }) {
  const [deckName, setDeckName] = useState("");
  const [options, setOptions] = useState([
    { id: 1, title: "", emoji: "🎯", gIdx: 0 },
    { id: 2, title: "", emoji: "🎬", gIdx: 1 },
  ]);
  const [step, setStep] = useState("form");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  function addOption() {
    setOptions(p => [...p, { id: Date.now(), title: "", emoji: "✨", gIdx: p.length % GROUP_GRADIENT_OPTIONS.length }]);
  }
  function removeOption(id) {
    setOptions(p => p.length > 1 ? p.filter(o => o.id !== id) : p);
  }
  function updateOption(id, field, value) {
    setOptions(p => p.map(o => o.id === id ? { ...o, [field]: value } : o));
  }

  function generate() {
    const valid = options.filter(o => o.title.trim());
    if (!deckName.trim() || valid.length < 2) return;
    const deck = {
      id: `gd-${Date.now()}`,
      name: deckName.trim(),
      createdBy: createdBy || "Anônimo",
      tasks: valid.map(o => ({
        id: `gt-${o.id}`,
        title: o.title.trim(),
        emoji: o.emoji || "✨",
        gradient: GROUP_GRADIENT_OPTIONS[o.gIdx].gradient,
        accent: GROUP_GRADIENT_OPTIONS[o.gIdx].accent,
      })),
      votes: [],
    };
    const link = buildGroupUrl(deck);
    setGeneratedLink(link);
    setStep("link");
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
  }

  function copyAgain() {
    navigator.clipboard?.writeText(generatedLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canGenerate = deckName.trim() && options.filter(o => o.title.trim()).length >= 2;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div><p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-0.5">Novo</p><h2 className="text-base font-bold text-white">Deck em grupo</h2></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
        </div>
        <div className="px-5 py-5 max-h-[75vh] overflow-y-auto">
          {step === "form" ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">Nome do deck</label>
                <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder='Ex: "Rolê de sexta"' className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition" autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-white/35">Opções (mín. 2)</label>
                  <button onClick={addOption} className="text-[11px] text-[#3b82f6] font-medium hover:text-blue-300 transition">+ Adicionar</button>
                </div>
                <div className="flex flex-col gap-2">
                  {options.map(opt => (
                    <div key={opt.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.07] p-2.5">
                      <div className="grid grid-cols-3 gap-1 flex-shrink-0">
                        {GROUP_GRADIENT_OPTIONS.map((g, idx) => (
                          <button key={idx} onClick={() => updateOption(opt.id, "gIdx", idx)} className={`w-4 h-4 rounded-full bg-gradient-to-br ${g.gradient} transition ${opt.gIdx === idx ? "ring-2 ring-white/60 ring-offset-1 ring-offset-[#18191f]" : ""}`} />
                        ))}
                      </div>
                      <input value={opt.emoji} onChange={e => updateOption(opt.id, "emoji", e.target.value)} className="w-8 rounded-lg bg-white/[0.05] border border-white/[0.07] py-1.5 text-sm text-center text-white outline-none flex-shrink-0" maxLength={2} />
                      <input value={opt.title} onChange={e => updateOption(opt.id, "title", e.target.value)} placeholder="Ex: Bar do Zé" className="flex-1 text-sm text-white placeholder:text-white/25 bg-transparent outline-none" />
                      {options.length > 1 && <button onClick={() => removeOption(opt.id)} className="text-white/20 hover:text-red-400 transition text-sm flex-shrink-0">✕</button>}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/20 text-center leading-relaxed">Modo assíncrono: cada pessoa abre o link, vota e devolve um link atualizado.</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/50">Cancelar</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={generate} disabled={!canGenerate} className="flex-1 py-3 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed">Gerar link →</motion.button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl">🔗</div>
              <div className="text-center">
                <h3 className="text-base font-bold text-white mb-1">Link gerado!</h3>
                <p className="text-[13px] text-white/40">Link copiado — manda no grupo</p>
              </div>
              <div className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5">
                <p className="text-[11px] text-white/30 break-all font-mono leading-relaxed">{generatedLink.slice(0, 80)}{generatedLink.length > 80 ? "…" : ""}</p>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={copyAgain} className={`w-full py-3 rounded-2xl text-sm font-semibold border transition ${copied ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-[#2563eb]/20 border-[#2563eb]/30 text-[#3b82f6] hover:bg-[#2563eb]/30"}`}>
                {copied ? "✓ Copiado!" : "Copiar link de novo"}
              </motion.button>
              <button onClick={onClose} className="text-[13px] text-white/30 hover:text-white/50 transition">Fechar</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── JoinGroupModal ────────────────────────────────────────────
function JoinGroupModal({ deck, onJoin, onClose }) {
  const [nick, setNick] = useState(() => { try { return localStorage.getItem(SK_GROUP_NICK) || ""; } catch { return ""; } });
  const [avatar, setAvatar] = useState(GROUP_AVATARS[0]);

  function handleJoin() {
    if (!nick.trim()) return;
    try { localStorage.setItem(SK_GROUP_NICK, nick.trim()); } catch {}
    onJoin(nick.trim(), avatar);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl">
        <div className="px-5 pt-6 pb-5">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">👥</div>
            <h2 className="text-lg font-bold text-white mb-1">Você foi convidado!</h2>
            <p className="text-sm text-white/50">Deck: <span className="text-white font-semibold">"{deck.name}"</span></p>
            {deck.createdBy && <p className="text-[11px] text-white/30 mt-1">por {deck.createdBy}</p>}
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">Seu apelido</label>
              <input value={nick} onChange={e => setNick(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoin()} placeholder="Ex: Guilherme" className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition" autoFocus />
            </div>
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">Seu avatar</label>
              <div className="grid grid-cols-8 gap-1.5">
                {GROUP_AVATARS.map(em => (
                  <button key={em} onClick={() => setAvatar(em)} className={`text-xl py-1.5 rounded-xl transition ${avatar === em ? "bg-[#2563eb]/30 ring-1 ring-[#2563eb]" : "hover:bg-white/[0.06]"}`}>{em}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/40">Fechar</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleJoin} disabled={!nick.trim()} className="flex-1 py-3 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40">Entrar e votar →</motion.button>
            </div>
          </div>
          <p className="text-[10px] text-white/20 text-center mt-4">Modo assíncrono · vote e devolva o link atualizado pro grupo</p>
        </div>
      </motion.div>
    </div>
  );
}

// ── GroupSwipeMode ────────────────────────────────────────────
function GroupSwipeMode({ deck, nick, avatar, onFinish }) {
  const [remaining, setRemaining] = useState([...deck.tasks]);
  const [votes, setVotes] = useState([]);
  const [swipeExit, setSwipeExit] = useState({ vx: 0, vy: 0, dir: null });

  const topTask = remaining[remaining.length - 1];

  function handleGroupSwipe(direction, task, vel = {}) {
    setSwipeExit({ ...vel, dir: direction });
    const vote = direction === "right" ? "topo" : direction === "left" ? "passo" : "amo";
    const newVote = { nick, avatar, taskId: task.id, vote };
    const newVotes = [...votes, newVote];
    setVotes(newVotes);
    const newRemaining = remaining.filter(t => t.id !== task.id);
    setRemaining(newRemaining);
    if (newRemaining.length === 0) onFinish(newVotes);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#111114] flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.05]">
        <div>
          <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-0.5">Deck em grupo</p>
          <h2 className="text-base font-bold text-white">{deck.name}</h2>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-3 py-1.5">
          <span className="text-base">{avatar}</span>
          <span className="text-[12px] text-white/60">{nick}</span>
        </div>
      </div>
      <div className="flex-shrink-0 px-5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-white/30 font-medium">Votando</span>
          <span className="text-[11px] text-white/20 bg-white/[0.05] px-2.5 py-0.5 rounded-full">{remaining.length} de {deck.tasks.length} restantes</span>
        </div>
        <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div className="h-full bg-purple-500 rounded-full" animate={{ width: `${((deck.tasks.length - remaining.length) / deck.tasks.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>
      <div className="flex-1 min-h-0 px-5 pt-2 pb-2 relative">
        <div className="relative w-full h-full">
          <AnimatePresence custom={swipeExit}>
            {remaining.slice(-3).reverse().map((task, i, arr) => {
              const isTop = i === 0;
              const stackIndex = arr.length - 1 - i;
              return <GroupTaskCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleGroupSwipe} />;
            })}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-2">
        <div className="flex items-center gap-1.5 text-red-400/45"><span className="text-[9px] font-semibold tracking-widest uppercase">Passo</span></div>
        <div className="flex flex-col items-center text-purple-400/45"><span className="text-[9px] font-semibold tracking-widest uppercase">Amo essa</span></div>
        <div className="flex items-center gap-1.5 text-emerald-400/45"><span className="text-[9px] font-semibold tracking-widest uppercase">Topo</span></div>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center pb-4">
        <ActionButtons onAction={(dir) => topTask && handleGroupSwipe(dir, topTask)} disabled={!topTask} />
      </div>
    </div>
  );
}

// ── GroupResultsScreen ────────────────────────────────────────
function GroupResultsScreen({ deck, myVotes, nick, avatar, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredOld = deck.votes.filter(v => v.nick !== nick);
  const allVotes = [...filteredOld, ...myVotes];
  const mergedDeck = { ...deck, votes: allVotes };
  const updatedLink = buildGroupUrl(mergedDeck);

  useEffect(() => {
    const t = setTimeout(() => {
      setRevealed(true);
      try {
        const colors = ["#8b5cf6", "#34d399", "#f59e0b"];
        const end = Date.now() + 2200;
        (function shoot() {
          confetti({ particleCount: 5, spread: 70, origin: { x: 0.3, y: 0.5 }, colors });
          confetti({ particleCount: 5, spread: 70, origin: { x: 0.7, y: 0.5 }, colors });
          if (Date.now() < end) requestAnimationFrame(shoot);
        })();
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const taskScores = deck.tasks.map(task => {
    const tv = allVotes.filter(v => v.taskId === task.id);
    const topoVoters = tv.filter(v => v.vote === "topo" || v.vote === "amo");
    const score = tv.reduce((acc, v) => acc + (v.vote === "amo" ? 2 : v.vote === "topo" ? 1 : 0), 0);
    return { task, topoVoters, score };
  }).sort((a, b) => b.score - a.score);

  function copyLink() {
    navigator.clipboard?.writeText(updatedLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#111114] flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div>
          <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-0.5">Resultado</p>
          <h2 className="text-base font-bold text-white">{deck.name}</h2>
        </div>
        <button onClick={onClose} className="text-sm text-white/30 hover:text-white/60 transition px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">✕ Fechar</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          {/* My votes summary */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-3">Seus votos ({avatar} {nick})</p>
            <div className="flex flex-wrap gap-2">
              {myVotes.map(v => {
                const task = deck.tasks.find(t => t.id === v.taskId);
                if (!task) return null;
                const label = v.vote === "amo" ? "Amo essa" : v.vote === "topo" ? "Topo!" : "Passo";
                const color = v.vote === "passo" ? "text-red-400 bg-red-500/10 border-red-500/20" : v.vote === "amo" ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                return <span key={v.taskId} className={`text-[11px] font-medium border px-2.5 py-1 rounded-full ${color}`}>{task.emoji} {task.title} · {label}</span>;
              })}
            </div>
          </div>

          {/* Scoreboard */}
          <div>
            <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-3">Placar geral</p>
            <div className="flex flex-col gap-3">
              {taskScores.map(({ task, topoVoters, score }, idx) => {
                const isWinner = idx === 0 && score > 0;
                return (
                  <motion.div key={task.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: revealed ? 1 : 0, x: revealed ? 0 : -16 }} transition={{ delay: idx * 0.1, type: "spring", stiffness: 200, damping: 22 }} className={`rounded-2xl border overflow-hidden ${isWinner ? "border-amber-500/40 bg-amber-500/[0.08]" : "border-white/[0.07] bg-white/[0.03]"}`}>
                    {isWinner && <div className="h-0.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400" />}
                    <div className="flex items-center gap-3 p-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${task.gradient} flex-shrink-0 shadow-lg`}>{task.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                          {isWinner && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/25 px-2 py-0.5 rounded-full flex-shrink-0">Vencedora 🏆</span>}
                        </div>
                        {topoVoters.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {topoVoters.slice(0, 5).map((v, i) => (
                                <div key={`${v.nick}-${i}`} className="w-6 h-6 rounded-full bg-white/[0.08] border-2 border-[#111114] flex items-center justify-center text-sm" style={{ marginLeft: i > 0 ? "-6px" : 0, zIndex: 10 - i }}>{v.avatar}</div>
                              ))}
                            </div>
                            <span className="text-[11px] text-white/40">{topoVoters.length} topou{topoVoters.length !== 1 ? "ram" : ""}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-white/20">Ninguém votou ainda</span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xl font-black ${isWinner ? "text-amber-400" : "text-white/30"}`}>{score}</p>
                        <p className="text-[9px] text-white/20">pts</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Share back */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
            <p className="text-[11px] text-white/40 mb-3 leading-relaxed">Seus votos foram adicionados ao link. Manda pro grupo pra todos verem o placar atualizado.</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={copyLink} className={`w-full py-3 rounded-2xl text-sm font-semibold transition border ${copied ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30"}`}>
              {copied ? "✓ Copiado!" : "Mandar minhas escolhas de volta"}
            </motion.button>
          </div>
          <p className="text-[10px] text-white/15 text-center pb-2">Modo assíncrono · o placar cresce conforme cada pessoa manda o link</p>
        </div>
      </div>
    </div>
  );
}

// ── ExploreTab ─────────────────────────────────────────────────
function ExploreTab({ invites, addRecipient, updateRecipientStatus, shareInvite, isMobile, unreadCount, onCreateGroup, onShareTask }) {
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
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`font-bold text-white ${isMobile ? "text-lg" : "text-xl"}`}>Convites enviados</h2>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key={unreadCount}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-[11px] bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full"
                >
                  {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="text-sm text-white/40">Delegue tarefas e acompanhe quem aceitou ou recusou em tempo real.</p>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={onCreateGroup} className="w-full py-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400 font-semibold text-sm hover:bg-purple-500/25 transition mb-6 flex items-center justify-center gap-2">
          <span>👥</span> Criar deck em grupo
        </motion.button>

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
                      {onShareTask && (
                        <button
                          onClick={() => onShareTask({ title: invite.title, description: invite.description, category: invite.category, emoji: invite.emoji, gradient: invite.gradient, accent: invite.accent })}
                          className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.09] transition"
                          title="Compartilhar como imagem"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-white/50">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" />
                          </svg>
                        </button>
                      )}
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

// ── HistorySection ───────────────────────────────────────────
function DecisionItem({ d, i, badgeStyle, formatDate, onShare }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
      <span className="text-2xl flex-shrink-0 leading-none">{d.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate leading-snug">{d.title}</p>
        <p className="text-[11px] text-white/30 mt-0.5">{d.category} · {formatDate(d.decidedAt)}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badgeStyle(d.label)}`}>{d.label}</span>
      {onShare && (
        <button onClick={() => onShare(decisionToShareTask(d))} className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/30 hover:text-white/60 transition flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      )}
    </div>
  );
}

function HistorySection({ decisions, onShare }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...decisions].reverse();
  const capped = sorted.slice(0, 50);
  const preview = capped.slice(0, 5);
  const extra = capped.slice(5);

  const badgeStyle = (label) => {
    if (label === "Aceito") return "bg-emerald-500/15 text-emerald-300";
    if (label === "Depois") return "bg-red-500/15 text-red-300";
    return "bg-[#2563eb]/15 text-[#93c5fd]";
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-3">
        Histórico <span className="text-white/20 normal-case tracking-normal font-normal">({decisions.length})</span>
      </h3>
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {capped.length === 0 ? (
          <p className="text-center text-white/25 text-[13px] py-7">Nenhuma decisão ainda</p>
        ) : (
          <>
            {preview.map((d, i) => (
              <DecisionItem key={d.id} d={d} i={i} badgeStyle={badgeStyle} formatDate={formatDate} onShare={onShare} />
            ))}
            <AnimatePresence>
              {expanded && extra.map((d, i) => (
                <motion.div key={d.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15, delay: Math.min(i * 0.025, 0.22) }} style={{ overflow: "hidden" }}>
                  <DecisionItem d={d} i={preview.length + i} badgeStyle={badgeStyle} formatDate={formatDate} onShare={onShare} />
                </motion.div>
              ))}
            </AnimatePresence>
            {extra.length > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-center gap-1.5 py-3 border-t border-white/[0.05] text-[12px] text-white/35 hover:text-white/55 transition">
                {expanded ? "Recolher" : `Ver tudo (${capped.length})`}
                <motion.svg animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── StreakFlame ───────────────────────────────────────────────
function StreakFlame({ count, onClick }) {
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

// ── StreakDetailModal ─────────────────────────────────────────
function StreakDetailModal({ streak, onClose }) {
  const weekDots = getWeekDots(streak);
  const DAY_LABELS = ["D","S","T","Q","Q","S","S"];
  const tier = streak.count === 0 ? 0 : streak.count <= 2 ? 1 : streak.count <= 6 ? 2 : streak.count <= 13 ? 3 : streak.count <= 29 ? 4 : 5;
  const tierLabel = ["Inativo","Iniciante","Regular","Dedicado","Implacável","Lendário"][tier];
  const tierBadge = ["bg-white/[0.06] text-white/30","bg-orange-500/20 text-orange-300","bg-orange-500/20 text-orange-300","bg-amber-500/20 text-amber-300","bg-sky-500/20 text-sky-300","bg-yellow-400/20 text-yellow-300"][tier];
  const rafMessages = [
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
          {/* RAF */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 mb-5">
            <p className="text-[10px] text-white/25 font-semibold tracking-widest uppercase mb-1.5">RAF diz:</p>
            <p className="text-[13px] text-white/55 italic leading-relaxed">"{rafMessages[tier]}"</p>
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/50 hover:text-white/70 transition">Fechar</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── StreakBrokenModal ─────────────────────────────────────────
function StreakBrokenModal({ oldCount, best, hasFreeze, onUseFreeze, onLetBreak }) {
  const [relit, setRelit] = useState(false);
  function handleUseFreeze() {
    setRelit(true);
    setTimeout(() => {
      try {
        const colors = ["#f59e0b","#ef4444","#3b82f6"];
        const end = Date.now() + 1400;
        (function shoot() {
          confetti({ particleCount: 4, spread: 60, origin: { x: 0.3, y: 0.5 }, colors });
          confetti({ particleCount: 4, spread: 60, origin: { x: 0.7, y: 0.5 }, colors });
          if (Date.now() < end) requestAnimationFrame(shoot);
        })();
      } catch {}
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
              <p className="text-[10px] text-white/25 font-semibold tracking-widest uppercase mb-1.5">RAF diz:</p>
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

// ── TaskShareModal ────────────────────────────────────────────
function TaskShareModal({ task, handle, onClose }) {
  const canvasRef = useRef(null);
  const [format, setFormat] = useState("square");
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    setRendering(true);
    drawTaskCard(canvasRef.current, task, format, handle)
      .then(() => setRendering(false))
      .catch(() => setRendering(false));
  }, [format]);

  function download() {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `taskmatch-${(task.title || "card").toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function share() {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { download(); return; }
      const fname = `taskmatch-${(task.title || "card").toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.png`;
      const file = new File([blob], fname, { type: "image/png" });
      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: "Bora decidir isso? 👀", title: `TaskMatch: ${task.title}` });
        } else { download(); }
      } catch (e) { if (e?.name !== "AbortError") download(); }
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-0.5">Compartilhar card</p>
            <h2 className="text-base font-bold text-white truncate max-w-[220px]">{task.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex rounded-xl bg-white/[0.04] p-1 gap-1">
            {[["square", "⬜ Quadrado"], ["story", "📱 Story"]].map(([id, lbl]) => (
              <button key={id} onClick={() => setFormat(id)} className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition ${format === id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"}`}>{lbl}</button>
            ))}
          </div>
          <div className={`w-full relative rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.07] ${format === "story" ? "aspect-[9/16]" : "aspect-square"}`}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ display: rendering ? "none" : "block" }} />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={download} className="flex-1 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 hover:text-white hover:bg-white/[0.08] transition flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Baixar
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={share} className="flex-1 py-3 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Compartilhar
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
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
  const [streak,       setStreak]       = usePersistedState(SK.streak, { count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });

  // Estados voláteis — resetam no reload (intencionalmente)
  const [toast,             setToast]             = useState({ visible: false, message: "", color: "" });
  const [activeTab,         setActiveTab]         = useState("home");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showAboutModal,    setShowAboutModal]    = useState(false);
  const [editedProfile,     setEditedProfile]     = useState(profile);
  const [isDesktop,         setIsDesktop]         = useState(window.innerWidth >= 1024);
  const [chatInput,         setChatInput]         = useState("");
  const [isChatLoading,     setIsChatLoading]     = useState(false);
  const [newTaskData,       setNewTaskData]       = useState({ title: "", description: "", category: "Alimentação", emoji: "✨", priority: null, deadline: "", image: null });
  const [swipeExit,         setSwipeExit]         = useState({ vx: 0, vy: 0, dir: null });
  const [showOnboarding,    setShowOnboarding]    = useState(() => !load("tm_onboarded", false));
  const [exploreSeenAt,     setExploreSeenAt]     = usePersistedState(SK.exploreSeenAt, null);
  const [showStreakDetail,  setShowStreakDetail]  = useState(false);
  const [streakBroken,     setStreakBroken]      = useState(null); // null | { oldCount, hasFreeze }
  const [riskDismissed,    setRiskDismissed]     = useState(false);

  // Group deck state
  const [groupDeck,           setGroupDeck]           = useState(null);
  const [groupMode,           setGroupMode]           = useState(null); // "join"|"swipe"|"results"
  const [groupNick,           setGroupNick]           = useState("");
  const [groupAvatar,         setGroupAvatar]         = useState(GROUP_AVATARS[0]);
  const [groupVotes,          setGroupVotes]          = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [shareTask,            setShareTask]            = useState(null);

  const chatEndRef    = useRef(null);
  const imageInputRef = useRef(null);
  const profileEmojis = ["😎", "🚀", "⚡", "🎯", "🔥", "💡", "🧠", "✅", "🏆", "👾"];

  // total dinâmico — conta tasks iniciais + criadas pelo usuário
  const total = Math.max(INITIAL_TASKS.length, load(SK.nextId, INITIAL_TASKS.length + 1) - 1);
  const remaining = tasks.length;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const sortedTasks = sortByUrgency(tasks);
  const topTask = sortedTasks[sortedTasks.length - 1];
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
  useEffect(() => {
    if (activeTab === "explore") setExploreSeenAt(new Date().toISOString());
  }, [activeTab]);

  useEffect(() => {
    const today = todayKey();
    const s = load(SK.streak, { count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
    if (s.lastActiveDate && daysBetween(s.lastActiveDate, today) > 1 && s.count > 0) {
      if (s.freezesAvailable > 0) {
        setStreakBroken({ oldCount: s.count, hasFreeze: true });
      } else {
        setStreakBroken({ oldCount: s.count, hasFreeze: false });
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (d) {
      const decoded = decodeGroupDeck(d);
      if (decoded?.id && decoded?.tasks?.length) {
        setGroupDeck(decoded);
        setGroupMode("join");
      }
    }
  }, []);

  const unreadCount = computeUnreadCount(invites, exploreSeenAt);

  // Streak risk: last active was yesterday, hour >= 18, hasn't decided today
  const streakAtRisk = (() => {
    if (!streak.lastActiveDate || streak.count === 0) return false;
    const today = todayKey();
    if (streak.lastActiveDate === today) return false;
    const gap = daysBetween(streak.lastActiveDate, today);
    return gap === 1 && new Date().getHours() >= 18;
  })();

  function showToast(message, color) { setToast({ visible: true, message, color }); setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800); }

  function registerActivity() {
    setStreak((s) => {
      const today = todayKey();
      if (s.lastActiveDate === today) return s;
      const gap = s.lastActiveDate ? daysBetween(s.lastActiveDate, today) : null;
      const count = (gap === null || gap > 1) ? 1 : (gap === 1 ? s.count + 1 : s.count);
      const gainFreeze = count % 7 === 0 && count > 0 && s.freezesAvailable < 2;
      if (gainFreeze) setTimeout(() => showToast("Você ganhou uma proteção de streak 🛡️", "bg-blue-600/90"), 400);
      return { ...s, count, best: Math.max(s.best, count), lastActiveDate: today, freezesAvailable: gainFreeze ? Math.min(2, s.freezesAvailable + 1) : s.freezesAvailable };
    });
  }

  function handleUseFreeze() {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    setStreak((s) => ({ ...s, lastActiveDate: yKey, freezesAvailable: Math.max(0, s.freezesAvailable - 1) }));
    setStreakBroken(null);
    showToast("Escudo usado! Streak salvo 🛡️🔥", "bg-amber-600/90");
  }

  function handleLetStreakBreak() {
    setStreak((s) => ({ ...s, count: 0 }));
    setStreakBroken(null);
  }

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
    setStreak({ count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
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
    setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, recipients: inv.recipients.map((r) => r.id === recipientId ? { ...r, status, updatedAt: new Date().toISOString() } : r) } : inv));
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

  // ── Group deck handlers ──────────────────────────────────
  function handleJoinGroup(nick, av) {
    setGroupNick(nick);
    setGroupAvatar(av);
    setGroupMode("swipe");
  }

  function handleGroupFinish(votes) {
    setGroupVotes(votes);
    setGroupMode("results");
  }

  function handleCloseGroup() {
    setGroupDeck(null);
    setGroupMode(null);
    setGroupVotes([]);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("d");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }

  // ── Swipe ────────────────────────────────────────────────
  async function handleSwipe(direction, task, vel = {}) {
    registerActivity();
    setRiskDismissed(true); // banner some após primeira decisão do dia
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
        {!isMobile && <div className="flex gap-2"><span className="text-[11px] font-semibold bg-[#2563eb]/15 text-[#93c5fd] px-3 py-1 rounded-full">Nível 7</span>{streak.count > 0 && <span className="text-[11px] font-semibold bg-amber-500/15 text-amber-300 px-3 py-1 rounded-full">🔥 {streak.count} {streak.count === 1 ? "dia" : "dias"}</span>}</div>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[{ label: "Feitas", value: stats.accepted + stats.rejected + stats.shared, color: "text-[#2563eb]" }, { label: "Sequência", value: streak.count, color: "text-amber-400" }, { label: "Taxa", value: stats.accepted + stats.rejected + stats.shared > 0 ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%` : "0%", color: "text-emerald-400" }].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3"><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-[11px] text-white/35 mt-0.5">{label}</div></div>
        ))}
        {streak.best > 0 && streak.best > streak.count && (
          <div className="col-span-3 flex items-center justify-center gap-1.5 py-0.5">
            <span className="text-[11px] text-white/25">Recorde pessoal:</span>
            <span className="text-[11px] font-semibold text-amber-400">🔥 {streak.best} dias</span>
          </div>
        )}
      </div>
      <HistorySection decisions={decisions} onShare={setShareTask} />
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskData.title.trim() || !newTaskData.description.trim()) { showToast("Preencha título e descrição.", "bg-red-600/90"); return; }
            const newTask = {
              id: nextTaskId,
              title: newTaskData.title.trim(),
              description: newTaskData.description.trim(),
              category: newTaskData.category,
              emoji: newTaskData.emoji || "✨",
              gradient: ONBOARDING_GRADIENTS[newTaskData.category]?.gradient || "from-sky-600 via-cyan-600 to-emerald-600",
              accent: ONBOARDING_GRADIENTS[newTaskData.category]?.accent || "#22c55e",
              priority: newTaskData.priority,
              deadline: newTaskData.deadline || null,
              image: newTaskData.image || null,
            };
            setTasks((prev) => [...prev, newTask]);
            setNextTaskId((id) => id + 1);
            setNewTaskData({ title: "", description: "", category: "Alimentação", emoji: "✨", priority: null, deadline: "", image: null });
            showToast("Tarefa criada!", "bg-emerald-600/90");
            setActiveTab("home");
          }}
          onPaste={async (e) => {
            const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith("image/"));
            if (!file) return;
            e.preventDefault();
            try {
              const url = await compressImage(file);
              if (url.length > 1_000_000) { showToast("Imagem muito grande.", "bg-red-600/90"); return; }
              setNewTaskData(p => ({ ...p, image: url }));
              showToast("Imagem colada!", "bg-emerald-600/90");
            } catch { showToast("Imagem inválida.", "bg-red-600/90"); }
          }}
          className={`${isMobile ? "flex flex-col gap-4" : "rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col gap-5"}`}
        >
          {/* Image upload */}
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Imagem <span className="normal-case text-white/20 font-normal tracking-normal">(opcional)</span></label>
            {newTaskData.image ? (
              <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08]" style={{ aspectRatio: "16/9" }}>
                <img src={newTaskData.image} className="w-full h-full object-cover" alt="" />
                <button type="button" onClick={() => setNewTaskData(p => ({ ...p, image: null }))} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/85 transition text-sm">✕</button>
              </div>
            ) : (
              <div
                className="w-full rounded-2xl border-2 border-dashed border-white/[0.11] bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/25 hover:bg-white/[0.04] transition py-8"
                onClick={() => imageInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (!file?.type.startsWith("image/")) return;
                  try {
                    const url = await compressImage(file);
                    if (url.length > 1_000_000) { showToast("Imagem muito grande.", "bg-red-600/90"); return; }
                    setNewTaskData(p => ({ ...p, image: url }));
                  } catch { showToast("Imagem inválida.", "bg-red-600/90"); }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-9 h-9 text-white/20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-[13px] text-white/30 font-medium">Clique, cole ou arraste</p>
                <p className="text-[11px] text-white/20">No celular, abre a câmera 📷</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await compressImage(file);
                if (url.length > 1_000_000) { showToast("Imagem muito grande.", "bg-red-600/90"); return; }
                setNewTaskData(p => ({ ...p, image: url }));
              } catch { showToast("Imagem inválida.", "bg-red-600/90"); }
              e.target.value = "";
            }} />
          </div>
          <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Título</label><input value={newTaskData.title} onChange={(e) => setNewTaskData((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition" placeholder="Ex: Comprar mantimentos" /></div>
          <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Descrição</label><textarea value={newTaskData.description} onChange={(e) => setNewTaskData((p) => ({ ...p, description: e.target.value }))} className="w-full min-h-[100px] rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 resize-none transition" placeholder="Detalhes da tarefa..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Categoria</label><select value={newTaskData.category} onChange={(e) => setNewTaskData((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60">{["Alimentação","Lazer","Saúde","Estudos","Trabalho","Outros"].map((c) => (<option key={c} value={c} className="bg-[#111114]">{c}</option>))}</select></div>
            <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Emoji</label><input value={newTaskData.emoji} onChange={(e) => setNewTaskData((p) => ({ ...p, emoji: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition" placeholder="✨" /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Prioridade</label>
            <div className="flex gap-2">
              {[{ value: "high", label: "🔴 Alta" }, { value: "medium", label: "🟡 Média" }, { value: "low", label: "🟢 Baixa" }].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setNewTaskData((p) => ({ ...p, priority: p.priority === value ? null : value }))} className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition border ${newTaskData.priority === value ? "bg-white/[0.12] border-white/25 text-white" : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/60 hover:border-white/15"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Prazo <span className="normal-case text-white/20 font-normal tracking-normal">(opcional)</span></label>
            <input type="date" value={newTaskData.deadline} onChange={(e) => setNewTaskData((p) => ({ ...p, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 transition [color-scheme:dark]" />
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
            <div className="flex items-center gap-1">
              <StreakFlame count={streak.count} onClick={() => setShowStreakDetail(true)} />
              <button onClick={() => setShowCreateGroupModal(true)} className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center" title="Criar deck em grupo"><span className="text-base leading-none">👥</span></button>
              <button onClick={() => setActiveTab("create")} className="w-9 h-9 rounded-2xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            </div>
          </div>

          {/* Streak risk banner */}
          <AnimatePresence>
            {activeTab === "home" && streakAtRisk && !riskDismissed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-shrink-0 overflow-hidden">
                <div className="mx-5 mb-1 flex items-center gap-2 bg-amber-500/15 border border-amber-500/25 rounded-xl px-3.5 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-[12px] text-amber-300 flex-1 leading-snug">Seu streak de <strong>{streak.count}</strong> dias acaba à meia-noite. Decide 1 task pra manter 🔥</p>
                  <button onClick={() => setRiskDismissed(true)} className="text-amber-400/50 hover:text-amber-400 transition text-sm flex-shrink-0">✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                    <div className="flex-1 min-h-0 px-5 pt-2 pb-2 relative"><div className="relative w-full h-full"><AnimatePresence custom={swipeExit}>{sortedTasks.slice(-3).reverse().map((task, i, arr) => { const isTop = i === 0; const stackIndex = arr.length - 1 - i; return (<SwipeCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleSwipe} onShare={isTop ? setShareTask : undefined} />); })}</AnimatePresence></div></div>
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
            {activeTab === "explore" && <ExploreTab invites={invites} addRecipient={addRecipient} updateRecipientStatus={updateRecipientStatus} shareInvite={shareInvite} isMobile={true} unreadCount={unreadCount} onCreateGroup={() => setShowCreateGroupModal(true)} onShareTask={setShareTask} />}
            {activeTab === "ia" && <RafContent isMobile={true} />}
            {activeTab === "create" && <CreateContent isMobile={true} />}
            {activeTab === "profile" && (
              <motion.div className="h-full overflow-y-auto px-5 pt-4 pb-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <ProfileContent isMobile={true} />
              </motion.div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center border-t border-white/[0.06] bg-[#111114]" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}>
            {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center gap-1 py-3"><div className="relative"><svg viewBox="0 0 24 24" fill="none" stroke={isActive ? "#3b82f6" : "rgba(255,255,255,0.22)"} strokeWidth={isActive ? 2.2 : 1.8} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>{tab.id === "explore" && <NavBadge count={unreadCount} />}</div><span className="text-[10px] font-medium" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.2)" }}>{tab.label}</span></button>); })}
          </div>
        </div>
      )}

      {/* ── DESKTOP ── */}
      {isDesktop && (
        <div className="w-full h-screen flex bg-[#111114]">
          <aside className="w-[220px] flex-shrink-0 bg-[#18181c] flex flex-col px-4 py-6 border-r border-white/[0.05]">
            <div className="mb-4 px-2 flex items-center justify-between"><div><h1 className="text-xl font-black tracking-tight leading-none text-white">Task<span style={{ color: "#2563eb" }}>Match</span></h1><p className="text-[11px] text-white/30 mt-1">Decida rápido, viva mais.</p></div><StreakFlame count={streak.count} onClick={() => setShowStreakDetail(true)} /></div>
            <nav className="flex flex-col gap-0.5">
              {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? "bg-[#2563eb]/15 text-[#93c5fd]" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`}><div className="relative flex-shrink-0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className="w-[17px] h-[17px]"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>{tab.id === "explore" && <NavBadge count={unreadCount} />}</div><span className="text-[13px] font-medium">{tab.label}</span></button>); })}
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
                {/* Streak risk banner desktop */}
                <AnimatePresence>
                  {streakAtRisk && !riskDismissed && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-shrink-0 overflow-hidden border-b border-amber-500/15">
                      <div className="flex items-center gap-3 px-10 py-2.5 bg-amber-500/[0.07]">
                        <span className="text-sm">⚠️</span>
                        <p className="text-[12px] text-amber-300 flex-1">Seu streak de <strong>{streak.count}</strong> dias acaba à meia-noite. Decide 1 task pra manter 🔥</p>
                        <button onClick={() => setRiskDismissed(true)} className="text-amber-400/40 hover:text-amber-400 transition text-sm">✕</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between px-10 pt-6 pb-3 flex-shrink-0 border-b border-white/[0.05]">
                  <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-white/30">Deck pessoal</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/20 bg-white/[0.05] px-3 py-1 rounded-full">{remaining} de {total} restantes</span>
                    <button onClick={() => setShowCreateGroupModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[12px] font-medium text-purple-400 hover:bg-purple-500/30 transition">👥 Deck em grupo</button>
                    <button onClick={() => setActiveTab("create")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[12px] font-medium text-[#3b82f6] hover:bg-[#2563eb]/30 transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Criar card</button>
                  </div>
                </div>
                {remaining > 0 && (<div className="px-10 pt-3 pb-1 flex-shrink-0"><div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-[#2563eb] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div></div>)}
                <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-6 min-h-0">
                  {remaining > 0 ? (
                    <>
                      <div className="relative w-full max-w-[520px]" style={{ height: cardHeight }}><AnimatePresence custom={swipeExit}>{sortedTasks.slice(-3).reverse().map((task, i, arr) => { const isTop = i === 0; const stackIndex = arr.length - 1 - i; return (<SwipeCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleSwipe} onShare={isTop ? setShareTask : undefined} />); })}</AnimatePresence></div>
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
            {activeTab === "explore" && <ExploreTab invites={invites} addRecipient={addRecipient} updateRecipientStatus={updateRecipientStatus} shareInvite={shareInvite} isMobile={false} unreadCount={unreadCount} onCreateGroup={() => setShowCreateGroupModal(true)} onShareTask={setShareTask} />}
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

      <AnimatePresence>
        {showCreateGroupModal && (
          <CreateGroupModal key="cgm" onClose={() => setShowCreateGroupModal(false)} createdBy={profile.name} />
        )}
        {showStreakDetail && (
          <StreakDetailModal key="sdm" streak={streak} onClose={() => setShowStreakDetail(false)} />
        )}
        {streakBroken && (
          <StreakBrokenModal
            key="sbm"
            oldCount={streakBroken.oldCount}
            best={streak.best}
            hasFreeze={streakBroken.hasFreeze}
            onUseFreeze={handleUseFreeze}
            onLetBreak={handleLetStreakBreak}
          />
        )}
        {shareTask && (
          <TaskShareModal key="tsm" task={shareTask} handle={profile.handle} onClose={() => setShareTask(null)} />
        )}
      </AnimatePresence>

      {groupMode === "join" && groupDeck && (
        <JoinGroupModal deck={groupDeck} onJoin={handleJoinGroup} onClose={handleCloseGroup} />
      )}
      {groupMode === "swipe" && groupDeck && (
        <GroupSwipeMode deck={groupDeck} nick={groupNick} avatar={groupAvatar} onFinish={handleGroupFinish} />
      )}
      {groupMode === "results" && groupDeck && (
        <GroupResultsScreen deck={groupDeck} myVotes={groupVotes} nick={groupNick} avatar={groupAvatar} onClose={handleCloseGroup} />
      )}

      <Toast visible={toast.visible} message={toast.message} color={toast.color} />
    </div>
  );
}