import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "./hooks/useAuth.js";
import { useSocial } from "./hooks/useSocial.js";
import { useUsernameStatus } from "./hooks/useUsernameStatus.js";
import { UsernameHint } from "./components/UsernameHint.jsx";
import { normalizeUsername } from "./lib/username.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { SetupProfile } from "./components/SetupProfile.jsx";
import { ShareToFeedModal } from "./components/ShareToFeedModal.jsx";
import { SocialExplore } from "./components/SocialExplore.jsx";
import { CreatePollModal } from "./components/CreatePollModal.jsx";
import { CommitmentFormModal } from "./components/CommitmentFormModal.jsx";
import { migrateAnonPolls } from "./lib/polls.js";
import { shouldAppearInDeck, recurrenceLabel, toDateStr } from "./lib/commitments.js";
import { todayKey, daysBetween } from "./lib/dates.js";
import { ActivityTab } from "./components/ActivityTab.jsx";
import { ProfileTab } from "./components/ProfileTab.jsx";
import { CreateTaskForm } from "./components/CreateTaskForm.jsx";
import { SwipeCard } from "./components/SwipeCard.jsx";
import { ONBOARDING_GRADIENTS } from "./lib/categories.js";
import { SnoozeSetupModal } from "./components/SnoozeSetupModal.jsx";
import { ChecklistModal } from "./components/ChecklistModal.jsx";
import { ListCompleteModal } from "./components/ListCompleteModal.jsx";
import { ActionButtons } from "./components/ActionButtons.jsx";
import { Toast } from "./components/Toast.jsx";
import { EmptyState } from "./components/EmptyState.jsx";
import { NavBadge } from "./components/NavBadge.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { StreakFlame, StreakDetailModal, StreakBrokenModal } from "./components/StreakWidgets.jsx";
import { IOSToggle } from "./components/IOSToggle.jsx";
import { TaskShareModal } from "./components/TaskShareModal.jsx";

// ── Storage keys ─────────────────────────────────────────────
const SK = {
  tasks:         "tm_tasks",
  stats:         "tm_stats",
  invites:       "tm_invites",
  profile:       "tm_profile",
  nextId:        "tm_next_id",
  raf:           "taskmatch_raf_history",  // legado — assistente RAF removido; chave mantida só para o "limpar dados" apagar resíduo de usuários antigos
  decisions:     "tm_decisions",  // histórico imutável de swipes
  exploreSeenAt: "tm_explore_seen_at",
  streak:        "tm_streak",
  notifs:        "tm_notifs",
  snoozeDefault:   "tm_snooze_default",    // "1h" | "1d"
  snoozeAsked:     "tm_snooze_asked",      // boolean — se já perguntamos a preferência
  commitments:     "tm_commitments",       // recurring commitments
  commitmentLog:   "tm_commitment_log",    // adherence log
};
// Anti-spam keys for notifications (1 dispatch per type per day)
const NOTIF_LAST_PEAK   = "tm_notif_last_peak";
const NOTIF_LAST_STREAK = "tm_notif_last_streak";

// ── Snooze helpers ────────────────────────────────────────────
function computeSnoozeUntil(snoozeDefault) {
  const d = new Date();
  if (snoozeDefault === "1h") d.setHours(d.getHours() + 1);
  else d.setDate(d.getDate() + 1); // "1d"
  return d.toISOString();
}

// URL-safe base64: replaces +/= so links survive WhatsApp, email, SMS
function b64encode(obj) {
  return btoa(encodeURIComponent(JSON.stringify(obj)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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

// Dispara um evento em vez de lançar: save() é chamada fora de componentes
// (dentro de setState updaters), então não há como mostrar toast direto daqui.
// O componente principal escuta "tm:storage-error" e avisa o usuário.
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    try { window.dispatchEvent(new CustomEvent("tm:storage-error", { detail: { key, err } })); } catch {}
  }
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

// ── Notification helpers ──────────────────────────────────────
// NOTE: Notifications only fire while the app tab is open. There is no service
// worker / Push API integration here, so they cannot wake a closed tab.
// To evolve: register a SW, use PushManager.subscribe(), send server-side push
// via Web Push (Supabase edge function or similar) — then call notify() in the
// SW's 'push' event handler instead of directly here.
function calcPeakHour(decisions) {
  if (decisions.length < 5) return 9; // fallback
  const counts = new Array(24).fill(0);
  for (const d of decisions) { try { counts[new Date(d.decidedAt).getHours()]++; } catch {} }
  return counts.indexOf(Math.max(...counts));
}
function notify(title, body, tag) {
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body, tag, icon: "/icon-192.png", badge: "/badge.png" }); } catch {}
}
// Reads state from localStorage directly — safe to call from setInterval without stale-closure issues.
function checkNotifications() {
  const settings = load(SK.notifs, { enabled: false, peakReminder: true, streakAlert: true });
  if (!settings.enabled || Notification.permission !== "granted") return;
  const today = todayKey();
  const nowH  = new Date().getHours();
  if (settings.peakReminder && localStorage.getItem(NOTIF_LAST_PEAK) !== today) {
    const dec  = load(SK.decisions, []);
    const peak = calcPeakHour(dec);
    if (nowH === peak && !dec.some(d => d.decidedAt?.startsWith(today))) {
      notify("Seu horário de foco chegou ⚡", "Bora decidir o que importa?", "peak-reminder");
      localStorage.setItem(NOTIF_LAST_PEAK, today);
    }
  }
  if (settings.streakAlert) {
    const s = load(SK.streak, { count: 0, lastActiveDate: null });
    if (s.count > 0 && nowH >= 19 && localStorage.getItem(NOTIF_LAST_STREAK) !== today) {
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      if (s.lastActiveDate === yest.toISOString().slice(0, 10)) {
        notify(`Seu streak de ${s.count} dias acaba à meia-noite 🔥`, "Decide 1 task pra manter!", "streak-alert");
        localStorage.setItem(NOTIF_LAST_STREAK, today);
      }
    }
  }
}

function fireDeckCompleteConfetti() {
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

// ── Main ─────────────────────────────────────────────────────
export default function TaskMatch() {
  const prefersReducedMotion = useReducedMotion();
  // Estados persistidos — sobrevivem ao reload
  const [tasks,     setTasks]     = usePersistedState(SK.tasks,   [...INITIAL_TASKS]);
  const [stats,     setStats]     = usePersistedState(SK.stats,   { accepted: 0, rejected: 0, shared: 0 });
  const [invites,   setInvites]   = usePersistedState(SK.invites, []);
  const [profile,   setProfile]   = usePersistedState(SK.profile, { name: "Seu Nome", handle: "@taskmatch", avatar: "👤" });
  const [nextTaskId, setNextTaskId] = usePersistedState(SK.nextId, INITIAL_TASKS.length + 1);
  const [decisions, setDecisions] = usePersistedState(SK.decisions, []); // histórico imutável
  const [streak,        setStreak]        = usePersistedState(SK.streak, { count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
  const [notifSettings, setNotifSettings] = usePersistedState(SK.notifs, { enabled: false, peakReminder: true, streakAlert: true, inviteReplies: true, permission: "default" });

  // ── Camada social (Supabase) ──────────────────────────────
  const auth   = useAuth();
  const social = useSocial(auth.user?.id);

  // Perfil efetivo da UI: logado → tabela "profiles" do Supabase é a fonte de
  // verdade; deslogado → perfil local do localStorage. Assim o nome/nick/emoji
  // persistem entre reloads e dispositivos quando há sessão.
  const displayProfile = (auth.isLoggedIn && auth.profile)
    ? {
        name:   auth.profile.display_name || auth.profile.username,
        handle: `@${auth.profile.username}`,
        avatar: auth.profile.avatar_emoji || "👤",
      }
    : profile;
  const [shareToFeedTask,    setShareToFeedTask]    = useState(null);
  const [showAuthModal,      setShowAuthModal]      = useState(false);
  const [respondedSocialIds, setRespondedSocialIds] = useState(() => new Set());

  // Estados voláteis — resetam no reload (intencionalmente)
  const [toast,             setToast]             = useState({ visible: false, message: "", color: "" });
  const [activeTab,         setActiveTab]         = useState("home");
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileEditError,  setProfileEditError]  = useState("");
  const [savingProfile,     setSavingProfile]     = useState(false);
  const [showAboutModal,    setShowAboutModal]    = useState(false);
  const [editedProfile,     setEditedProfile]     = useState(profile);
  // Disponibilidade do username no editor (logado). Ignora o nick atual do usuário.
  const editorUsernameStatus = useUsernameStatus(
    auth.isLoggedIn ? editedProfile.handle : "",
    auth.checkUsername,
    displayProfile.handle,
  );
  const [isDesktop,         setIsDesktop]         = useState(window.innerWidth >= 1024);
  const [newTaskData,       setNewTaskData]       = useState({ title: "", description: "", category: "Alimentação", emoji: "✨", priority: null, deadline: "", image: null, items: [], isChecklist: false });
  const [swipeExit,         setSwipeExit]         = useState({ vx: 0, vy: 0, dir: null });
  const [showOnboarding,    setShowOnboarding]    = useState(() => !load("tm_onboarded", false));
  const [exploreSeenAt,     setExploreSeenAt]     = usePersistedState(SK.exploreSeenAt, null);
  const [showStreakDetail,  setShowStreakDetail]  = useState(false);
  const [streakBroken,     setStreakBroken]      = useState(null); // null | { oldCount, hasFreeze }
  const [riskDismissed,    setRiskDismissed]     = useState(false);
  const [snoozeDefault,    setSnoozeDefault]     = usePersistedState(SK.snoozeDefault, "1d");
  const [snoozeAsked,      setSnoozeAsked]       = usePersistedState(SK.snoozeAsked, false);
  const [pendingSnoozeTask, setPendingSnoozeTask] = useState(null);
  const [returnedTaskIds,   setReturnedTaskIds]   = useState(() => new Set());
  const [checklistTaskId,       setChecklistTaskId]       = useState(null);
  const [listCompleteCtx,       setListCompleteCtx]       = useState(null); // { task, vel, willEmpty }
  const [commitments,           setCommitments]           = usePersistedState(SK.commitments, []);
  const [commitmentLog,         setCommitmentLog]         = usePersistedState(SK.commitmentLog, []);
  const [showCreateCommitment,  setShowCreateCommitment]  = useState(false);
  const [editingCommitment,     setEditingCommitment]     = useState(null); // commitment obj | null

  const [showCreatePollModal,  setShowCreatePollModal]  = useState(false);
  const [shareTask,            setShareTask]            = useState(null);
  const [showNotifSettings,    setShowNotifSettings]    = useState(false);

  const imageInputRef = useRef(null);
  const profileEmojis = ["😎", "🚀", "⚡", "🎯", "🔥", "💡", "🧠", "✅", "🏆", "👾"];

  // total dinâmico — conta tasks iniciais + criadas pelo usuário
  const activeTasks = tasks.filter(t => !t.snoozeUntil || new Date(t.snoozeUntil) <= new Date());
  const total = Math.max(INITIAL_TASKS.length, load(SK.nextId, INITIAL_TASKS.length + 1) - 1);
  const remaining = activeTasks.length;
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const sortedTasks = sortByUrgency(activeTasks);

  // ── Mixed deck: personal + friend tasks ──────────────────
  const socialDeckItems = auth.isLoggedIn
    ? (social.feed || [])
        .filter(t => !t.myResponse && !respondedSocialIds.has(t.id))
        .slice(0, 8)
        .map(t => ({
          id: `social-${t.id}`,
          _socialId: t.id,
          _source: "friend",
          _author: t.author,
          _closeFriend: t.author?.isCloseFriend,
          title: t.title,
          description: t.description || "",
          category: t.category || "Social",
          emoji: t.emoji || "✨",
          gradient: t.gradient || "from-violet-700 via-purple-700 to-indigo-800",
          accent: "#8b5cf6",
          image: t.image_url || null,
          priority: null,
          deadline: null,
        }))
    : [];

  const loginPromptCard = !auth.isLoggedIn ? {
    id: "login-prompt",
    _source: "login_prompt",
    title: "Tasks dos seus amigos",
    description: "Entre para ver e reagir às tasks que seus amigos estão decidindo.",
    emoji: "👋",
    gradient: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
    category: "Social",
    accent: "#2563eb",
    priority: null,
    deadline: null,
  } : null;

  // Commitment cards due today (not yet logged)
  const todayCommitmentCards = commitments
    .filter(c => shouldAppearInDeck(c, commitmentLog))
    .map(c => ({
      id: `commitment-${c.id}-${toDateStr(new Date())}`,
      _source: "commitment",
      _commitmentId: c.id,
      title: c.title,
      emoji: c.emoji,
      category: c.category,
      gradient: c.gradient,
      accent: c.accent,
      description: recurrenceLabel(c),
      priority: null,
      deadline: null,
    }));

  const mixedDeck = (() => {
    const personal = sortedTasks.map(t => ({ ...t, _source: "self" }));
    const result = [...personal, ...todayCommitmentCards, ...socialDeckItems];
    if (loginPromptCard && result.length > 0) {
      result.splice(Math.max(0, personal.length - 1), 0, loginPromptCard);
    } else if (loginPromptCard) {
      result.push(loginPromptCard);
    }
    return result;
  })();
  const mixedTopTask    = mixedDeck[mixedDeck.length - 1];
  const mixedRemaining  = mixedDeck.length;
  const cardHeight = isDesktop ? 420 : 360;

  useEffect(() => { function h() { setIsDesktop(window.innerWidth >= 1024); } window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => {
    if (activeTab === "social") setExploreSeenAt(new Date().toISOString());
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps -- setExploreSeenAt é o setter de usePersistedState, estável

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

  // Run notification check once on app open
  useEffect(() => { checkNotifications(); }, []);
  // Periodic check every 5min while notifications are enabled
  useEffect(() => {
    if (!notifSettings.enabled) return;
    const id = setInterval(checkNotifications, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [notifSettings.enabled]);

  // Wake snoozed tasks whose snoozeUntil has passed
  useEffect(() => {
    function wakeSnoozed() {
      const now = new Date();
      const woken = [];
      setTasks(prev => prev.map(t => {
        if (t.snoozeUntil && new Date(t.snoozeUntil) <= now) {
          woken.push(t.id);
          const { snoozeUntil: _snoozeUntil, ...rest } = t;
          return rest;
        }
        return t;
      }));
      if (woken.length > 0) {
        setReturnedTaskIds(prev => {
          const next = new Set(prev);
          woken.forEach(id => next.add(id));
          return next;
        });
      }
    }
    wakeSnoozed();
    const id = setInterval(wakeSnoozed, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- setTasks é o setter de usePersistedState, estável

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

  // Avisa 1x por sessão se o localStorage não conseguir mais salvar (cota
  // cheia) — sem isso, tasks/decisões/streak param de persistir em silêncio.
  const storageWarnedRef = useRef(false);
  useEffect(() => {
    function onStorageError() {
      if (storageWarnedRef.current) return;
      storageWarnedRef.current = true;
      showToast("Armazenamento cheio — novas alterações podem não estar sendo salvas. Remova tarefas com imagens ou libere espaço no dispositivo.", "bg-red-600/90");
    }
    window.addEventListener("tm:storage-error", onStorageError);
    return () => window.removeEventListener("tm:storage-error", onStorageError);
  }, []);

  // ── Notification permission / toggle ────────────────────────
  async function handleEnableNotifs(wantEnabled) {
    if (!("Notification" in window)) { showToast("Seu browser não suporta notificações.", "bg-red-600/90"); return; }
    if (!wantEnabled) { setNotifSettings(s => ({ ...s, enabled: false })); return; }
    if (Notification.permission === "denied") { setNotifSettings(s => ({ ...s, permission: "denied" })); return; }
    if (Notification.permission === "granted") {
      setNotifSettings(s => ({ ...s, enabled: true, permission: "granted" }));
      setTimeout(() => notify("Notificações ativadas 🔔", "Você vai receber lembretes inteligentes.", "test-notif"), 200);
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setNotifSettings(s => ({ ...s, enabled: true, permission: "granted" }));
      setTimeout(() => notify("Notificações ativadas 🔔", "Você vai receber lembretes inteligentes.", "test-notif"), 200);
    } else {
      setNotifSettings(s => ({ ...s, permission: result }));
    }
  }

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

  function openProfileEditor() { setEditedProfile(displayProfile); setProfileEditError(""); setShowProfileEditor(true); }
  function closeProfileEditor() { setShowProfileEditor(false); }
  async function saveProfileEdits() {
    const name = editedProfile.name.trim() || displayProfile.name;
    const rawHandle = editedProfile.handle.trim().replace(/^@+/, "");
    const handle = rawHandle ? `@${rawHandle}` : displayProfile.handle;
    const avatar = editedProfile.avatar.trim() || displayProfile.avatar;

    // Logado: o banco é a fonte de verdade — persiste em "profiles" e só atualiza
    // o estado local após a confirmação do update.
    if (auth.isLoggedIn) {
      const username = normalizeUsername(rawHandle);
      // A verificação em tempo real já bloqueia o botão; aqui é a última trava.
      if (editorUsernameStatus !== "available") {
        setProfileEditError(editorUsernameStatus === "taken"
          ? "Esse username já está em uso. Tente outro."
          : "Username inválido (3–20 caracteres: letras, números, _ e .).");
        return;
      }
      setSavingProfile(true); setProfileEditError("");
      try {
        await auth.updateProfile({ display_name: name, username, avatar_emoji: avatar });
        setProfile({ name, handle: `@${username}`, avatar }); // localStorage vira só cache
        setShowProfileEditor(false);
      } catch (err) {
        // 23505 = violação de unique do Postgres (corrida entre dois saves).
        setProfileEditError(
          err.code === "23505" || err.message?.includes("duplicate") || err.message?.includes("unique")
            ? "Esse username acabou de ser usado, tente outro."
            : "Não foi possível salvar o perfil. Tente novamente."
        );
      } finally {
        setSavingProfile(false);
      }
      return;
    }

    // Deslogado: mantém o comportamento atual (salva só no localStorage).
    setProfile({ ...profile, name, handle, avatar });
    setShowProfileEditor(false);
  }
  function handleLogout() {
    if (!window.confirm("Deseja sair do TaskMatch?")) return;
    if (auth.isLoggedIn) { auth.signOut(); showToast("Sessão encerrada.", "bg-white/10"); }
    else showToast("Não há sessão ativa.", "bg-white/10");
  }

  function clearAllData() {
    if (!window.confirm("Apagar todos os dados? Tasks, histórico e convites serão removidos.")) return;
    Object.values(SK).forEach((key) => { try { localStorage.removeItem(key); } catch {} });
    [NOTIF_LAST_PEAK, NOTIF_LAST_STREAK].forEach(k => { try { localStorage.removeItem(k); } catch {} });
    setTasks([...INITIAL_TASKS]);
    setStats({ accepted: 0, rejected: 0, shared: 0 });
    setInvites([]);
    setDecisions([]);
    setNextTaskId(INITIAL_TASKS.length + 1);
    setStreak({ count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
    setNotifSettings({ enabled: false, peakReminder: true, streakAlert: true, inviteReplies: true, permission: "default" });
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

  function handleCreateTaskSubmit(e) {
    e.preventDefault();
    if (!newTaskData.title.trim()) { showToast("Preencha o título.", "bg-red-600/90"); return; }
    if (!newTaskData.isChecklist && !newTaskData.description.trim()) { showToast("Preencha a descrição.", "bg-red-600/90"); return; }
    if (newTaskData.isChecklist && !newTaskData.items.some(i => i.text.trim())) { showToast("Adicione pelo menos 1 item.", "bg-red-600/90"); return; }
    const cleanItems = newTaskData.isChecklist ? newTaskData.items.filter(i => i.text.trim()).map((item, i) => ({ ...item, text: item.text.trim(), order: i })) : undefined;
    const newTask = { id: nextTaskId, title: newTaskData.title.trim(), description: newTaskData.description.trim(), category: newTaskData.category, emoji: newTaskData.emoji || "✨", gradient: ONBOARDING_GRADIENTS[newTaskData.category]?.gradient || "from-sky-600 via-cyan-600 to-emerald-600", accent: ONBOARDING_GRADIENTS[newTaskData.category]?.accent || "#22c55e", priority: newTaskData.priority, deadline: newTaskData.deadline || null, image: newTaskData.image || null, ...(cleanItems ? { items: cleanItems } : {}) };
    setTasks((prev) => [...prev, newTask]);
    setNextTaskId((id) => id + 1);
    setNewTaskData({ title: "", description: "", category: "Alimentação", emoji: "✨", priority: null, deadline: "", image: null, items: [], isChecklist: false });
    showToast("Tarefa criada!", "bg-emerald-600/90");
    setActiveTab("home");
  }

  function handleShareNewTaskToFeed() {
    setShareToFeedTask({ title: newTaskData.title.trim(), description: newTaskData.description.trim(), category: newTaskData.category, emoji: newTaskData.emoji || "✨", gradient: ONBOARDING_GRADIENTS[newTaskData.category]?.gradient || "from-blue-600 via-sky-600 to-cyan-600", image: newTaskData.image });
  }

  // ── Invite helpers ───────────────────────────────────────
  function addRecipient(inviteId, name) {
    if (!name.trim()) return;
    setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, recipients: [...inv.recipients, { id: Date.now(), name: name.trim(), status: "pending" }] } : inv));
  }
  function updateRecipientStatus(inviteId, recipientId, status) {
    // Capture before state update for notification
    const invite    = invites.find(inv => inv.id === inviteId);
    const recipient = invite?.recipients.find(r => r.id === recipientId);
    setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, recipients: inv.recipients.map((r) => r.id === recipientId ? { ...r, status, updatedAt: new Date().toISOString() } : r) } : inv));
    // Invite-reply notification (event-driven, no anti-spam beyond unique tag per recipient)
    // When adding Supabase realtime: call notify() inside the channel.on('UPDATE', ...) callback here.
    if (notifSettings.enabled && notifSettings.inviteReplies && recipient) {
      const verb = status === "accepted" ? "aceitou" : "recusou";
      notify(`${recipient.name} ${verb} "${invite.title}"`, status === "accepted" ? "Tarefa aceita ✓" : "Tarefa recusada.", `invite-reply-${recipientId}`);
    }
  }
  function shareInvite(invite) {
    const payload = {
      id: invite.id, // correlação fraca — deixa quem recebeu registrar a resposta em invite_link_responses
      title: invite.title,
      description: invite.description,
      emoji: invite.emoji,
      category: invite.category,
      gradient: invite.gradient,
      accent: invite.accent || "#2563eb",
    };
    const encoded = b64encode(payload);
    const url = `${window.location.origin}${window.location.pathname}#/invite/${encoded}`;
    if (navigator.share) {
      navigator.share({ title: `TaskMatch: ${invite.title}`, text: `Você foi convidado: "${invite.title}"`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      showToast("Link copiado!", "bg-emerald-600/90");
    }
  }

  // ── Envio em massa (Supabase shared_tasks + rastreio local) ──────
  // Publica a task no feed dos amigos (audience close=favoritos | friends=todos)
  // e cria um invite local de rastreamento com os destinatários escolhidos,
  // pra acompanhar respostas em "Convites enviados". As respostas reais do
  // Supabase são sincronizadas no efeito abaixo.
  async function handleMassSend(task, audience, recipientProfiles) {
    const row = await social.massShare(task, audience); // lança em caso de erro
    const newInvite = {
      id: `social-${row?.id || Date.now()}`,
      sharedTaskId: row?.id || null,
      title: task.title,
      description: task.description || "",
      category: task.category || "",
      emoji: task.emoji || "✨",
      gradient: task.gradient || "from-blue-600 to-purple-700",
      accent: task.accent || "#2563eb",
      audience,
      sentAt: new Date().toISOString(),
      recipients: recipientProfiles.map((p) => ({
        id: p.id, profileId: p.id, name: `@${p.username}`, username: p.username,
        avatar: p.avatar_emoji, status: "pending",
      })),
    };
    setInvites((prev) => [newInvite, ...prev]);
    setActiveTab("social");
  }

  async function handleResendFavorites(invite) {
    const favs = social.friends.filter((f) => f.isCloseFriend).map((f) => f.profile);
    if (favs.length === 0) { showToast("Você ainda não tem favoritos.", "bg-white/10"); return; }
    try {
      await handleMassSend(
        { title: invite.title, description: invite.description, category: invite.category, emoji: invite.emoji, gradient: invite.gradient, accent: invite.accent },
        "close", favs,
      );
      showToast(`Reenviado para ${favs.length} favorito${favs.length > 1 ? "s" : ""}! ⭐`, "bg-emerald-600/90");
    } catch (err) {
      showToast(err.message || "Não foi possível reenviar.", "bg-red-600/90");
    }
  }

  // Sincroniza o status dos destinatários dos invites sociais com as respostas
  // reais vindas do Supabase (approved/reshared → aceito, rejected → recusou).
  useEffect(() => {
    if (!social.sentTasks?.length) return;
    setInvites((prev) => {
      let changed = false;
      const next = prev.map((inv) => {
        if (!inv.sharedTaskId) return inv;
        const st = social.sentTasks.find((t) => t.id === inv.sharedTaskId);
        if (!st) return inv;
        const respMap = {};
        for (const r of st.responses || []) respMap[r.responder_id] = r.response;
        let invChanged = false;
        const recipients = inv.recipients.map((rc) => {
          const resp = respMap[rc.profileId];
          if (!resp) return rc;
          const status = resp === "rejected" ? "declined" : "accepted";
          if (status === rc.status) return rc;
          invChanged = true;
          return { ...rc, status };
        });
        if (!invChanged) return inv;
        changed = true;
        return { ...inv, recipients };
      });
      return changed ? next : prev;
    });
  }, [social.sentTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ao logar, vincula as enquetes criadas anonimamente à conta.
  useEffect(() => {
    if (auth.user?.id) migrateAnonPolls(auth.user.id).catch(() => {});
  }, [auth.user?.id]);

  // ── Keyboard shortcuts: seta esquerda/direita/cima = swipe ───
  const _kbRef = useRef({});
  _kbRef.current = { activeTab, mixedTopTask, listCompleteCtx, pendingSnoozeTask, showAuthModal, checklistTaskId, shareTask, shareToFeedTask, showOnboarding, handleSwipe };
  useEffect(() => {
    function onKeyDown(e) {
      const s = _kbRef.current;
      if (s.activeTab !== "home" || !s.mixedTopTask) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable) return;
      if (s.listCompleteCtx || s.pendingSnoozeTask || s.showAuthModal || s.checklistTaskId || s.shareTask || s.shareToFeedTask || s.showOnboarding) return;
      const dir = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up" }[e.key];
      if (!dir) return;
      e.preventDefault();
      s.handleSwipe(dir, s.mixedTopTask);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Swipe ────────────────────────────────────────────────
  async function handleSwipe(direction, task, vel = {}) {
    // Login prompt card — abrir modal de auth
    if (task._source === "login_prompt") {
      setShowAuthModal(true);
      return;
    }

    // Commitment card — logar adesão e remover do deck
    if (task._source === "commitment") {
      try { if (navigator.vibrate) navigator.vibrate(direction === "right" ? [30, 50, 30] : 30); } catch {}
      setSwipeExit({ vx: 0, vy: 0, ...vel, dir: direction });
      if (direction === "right" || direction === "up") {
        handleLogCommitment(task._commitmentId, "done");
      } else {
        handleLogCommitment(task._commitmentId, "missed");
      }
      return;
    }

    // Task de amigo — responder no Supabase, não altera deck local
    if (task._source === "friend") {
      try { if (navigator.vibrate) navigator.vibrate(direction === "up" ? 80 : direction === "right" ? [30, 50, 30] : 30); } catch {}
      setSwipeExit({ vx: 0, vy: 0, ...vel, dir: direction });
      setRespondedSocialIds(prev => new Set([...prev, task._socialId]));
      const responseMap = { right: "approved", left: "rejected", up: "reshared" };
      const toastMap = {
        right: ["✓ Aprovado!", "bg-emerald-600/90 backdrop-blur-md"],
        left:  ["× Passei", "bg-red-600/90 backdrop-blur-md"],
        up:    ["↑ Recompartilhado!", "bg-[#2563eb]/90 backdrop-blur-md"],
      };
      showToast(...(toastMap[direction] || toastMap.left));
      try {
        await social.respondToTask(task._socialId, responseMap[direction] || "rejected");
      } catch {
        setRespondedSocialIds(prev => { const next = new Set(prev); next.delete(task._socialId); return next; });
        showToast("Não foi possível registrar sua resposta. Tente de novo.", "bg-red-600/90 backdrop-blur-md");
      }
      return;
    }

    const deckWillEmpty = activeTasks.length === 1;

    // Aceitar — delega pra acceptTask (mesma lógica usada pelo fluxo de checklist)
    if (direction === "right") {
      if (task.items?.length > 0 && task.items.some(i => !i.done)) {
        setSwipeExit({ vx: 0, vy: 0, ...vel, dir: direction });
        setListCompleteCtx({ task, vel, willEmpty: deckWillEmpty });
        return;
      }
      acceptTask(task, vel, deckWillEmpty);
      return;
    }

    registerActivity();
    setRiskDismissed(true); // banner some após primeira decisão do dia
    setSwipeExit({ vx: 0, vy: 0, ...vel, dir: direction });

    try { if (navigator.vibrate) {
      if (direction === "left") navigator.vibrate(30);
      else if (direction === "up") navigator.vibrate(80);
    }} catch {}

    if (direction === "left") {
      if (!snoozeAsked) {
        setPendingSnoozeTask(task);
        setSnoozeAsked(true);
        return; // Modal handles the actual snooze
      }
      logPostponeDecision(task);
      const snoozeUntil = computeSnoozeUntil(snoozeDefault);
      setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, snoozeUntil } : t));
      showToast("⏰  Adiado", "bg-amber-600/90 backdrop-blur-md");
      return;
    }

    // direction === "up" — delegar
    const decision = {
      id: Date.now(),
      taskId: task.id,
      title: task.title,
      emoji: task.emoji,
      category: task.category,
      direction,
      decidedAt: new Date().toISOString(),
    };
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
    setActiveTab("social");
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    if (deckWillEmpty && !prefersReducedMotion) fireDeckCompleteConfetti();
  }

  // ── Commitment handlers ──────────────────────────────────
  function handleSaveCommitment(data) {
    if (data.id) {
      setCommitments(prev => prev.map(c => c.id === data.id ? data : c));
    } else {
      setCommitments(prev => [{ ...data, id: `c-${Date.now()}` }, ...prev]);
    }
    setShowCreateCommitment(false);
    setEditingCommitment(null);
  }

  function handleLogCommitment(commitmentId, status) {
    const dateStr = toDateStr(new Date());
    setCommitmentLog(prev => {
      const without = prev.filter(e => !(e.commitmentId === commitmentId && e.date === dateStr));
      return [...without, { commitmentId, date: dateStr, status, loggedAt: new Date().toISOString() }];
    });
    showToast(
      status === "done" ? "✓ Compromisso feito!" : "Pulei",
      status === "done" ? "bg-emerald-600/90 backdrop-blur-md" : "bg-amber-600/90 backdrop-blur-md"
    );
  }

  function handleDeleteCommitment(commitmentId) {
    setCommitments(prev => prev.filter(c => c.id !== commitmentId));
    setCommitmentLog(prev => prev.filter(e => e.commitmentId !== commitmentId));
  }

  function handleTogglePauseCommitment(commitmentId) {
    setCommitments(prev => prev.map(c =>
      c.id === commitmentId ? { ...c, paused: !c.paused } : c
    ));
  }

  function handleSnoozeChoice(pref, task) {
    setSnoozeDefault(pref);
    logPostponeDecision(task);
    const snoozeUntil = computeSnoozeUntil(pref);
    setTasks((prev) => prev.map(t => t.id === task.id ? { ...t, snoozeUntil } : t));
    setPendingSnoozeTask(null);
    showToast("⏰  Adiado", "bg-amber-600/90 backdrop-blur-md");
  }

  function handleWakeTask(taskId) {
    setTasks((prev) => prev.map(t => {
      if (t.id !== taskId) return t;
      const { snoozeUntil: _snoozeUntil, ...rest } = t;
      return rest;
    }));
    setReturnedTaskIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    showToast("✓  Tarefa de volta!", "bg-emerald-600/90 backdrop-blur-md");
  }

  // Agenda semanal (Atividade): agenda uma tarefa pra um dia (dateStr) ou
  // limpa a data (dateStr null) — reusa o campo `deadline` que já existe.
  function handleScheduleTask(taskId, dateStr) {
    setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, deadline: dateStr } : t));
    showToast(dateStr ? "📅  Agendado" : "Data removida", "bg-[#2563eb]/90 backdrop-blur-md");
  }

  function handleSnoozeMore(taskId) {
    const snoozeUntil = computeSnoozeUntil(snoozeDefault);
    setTasks((prev) => prev.map(t => t.id === taskId ? { ...t, snoozeUntil } : t));
    showToast("⏰  Adiado novamente", "bg-amber-600/90 backdrop-blur-md");
  }

  // ── Checklist helpers ────────────────────────────────────
  function handleToggleItem(taskId, itemId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, items: (t.items || []).map(item => item.id === itemId ? { ...item, done: !item.done } : item) };
    }));
  }

  function handleAddListItem(taskId, text) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newItem = { id: Date.now(), text: text.trim(), emoji: null, done: false, order: (t.items || []).length };
      return { ...t, items: [...(t.items || []), newItem] };
    }));
  }

  function handleOpenChecklist(task) {
    setChecklistTaskId(task.id);
  }

  // Cria uma lista vazia direto da aba Listas — sem passar pelo formulário
  // completo de criação de tarefa (título só, itens vêm depois, inline).
  function handleCreateChecklist(title) {
    setTasks(prev => [...prev, {
      id: nextTaskId,
      title: title.trim(),
      description: "",
      category: "Lista",
      emoji: "📝",
      gradient: "from-emerald-600 via-teal-600 to-cyan-700",
      accent: "#10b981",
      items: [],
    }]);
    setNextTaskId(n => n + 1);
    showToast("Lista criada!", "bg-emerald-600/90 backdrop-blur-md");
  }

  // Marca uma lista como concluída direto da aba Listas (todos os itens já
  // feitos) — mesmo fluxo de "aceitar" usado no swipe, só sem o gesto.
  function handleCompleteChecklist(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    acceptTask(task, {}, activeTasks.length === 1);
  }

  // Extract accept logic so it can be called from both handleSwipe and ListCompleteModal handlers
  function acceptTask(task, vel = {}, willEmpty = false) {
    registerActivity();
    setRiskDismissed(true);
    setSwipeExit({ vx: 0, vy: 0, ...vel, dir: "right" });
    try { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); } catch {}
    const decision = { id: Date.now(), taskId: task.id, title: task.title, emoji: task.emoji, category: task.category, direction: "right", decidedAt: new Date().toISOString() };
    setStats(s => ({ ...s, accepted: s.accepted + 1 }));
    setDecisions(prev => [{ ...decision, label: "Feito" }, ...prev].slice(0, 200));
    showToast("✓  Feito!", "bg-emerald-600/90 backdrop-blur-md");
    setTasks(prev => prev.filter(t => t.id !== task.id));
    if (willEmpty && !prefersReducedMotion) fireDeckCompleteConfetti();
  }

  // Registra a decisão de adiar (swipe esquerda) — mesma lógica usada tanto
  // no fluxo direto (handleSwipe) quanto na primeira vez (handleSnoozeChoice).
  function logPostponeDecision(task) {
    const decision = { id: Date.now(), taskId: task.id, title: task.title, emoji: task.emoji, category: task.category, direction: "left", decidedAt: new Date().toISOString() };
    setStats(s => ({ ...s, rejected: s.rejected + 1 }));
    setDecisions(prev => [{ ...decision, label: "Fazer" }, ...prev].slice(0, 200));
  }

  function handleListCompleteAnyway() {
    if (!listCompleteCtx) return;
    const { task, vel, willEmpty } = listCompleteCtx;
    setListCompleteCtx(null);
    acceptTask(task, vel, willEmpty);
  }

  function handleListCreatePending() {
    if (!listCompleteCtx) return;
    const { task, vel, willEmpty } = listCompleteCtx;
    const pendingItems = (task.items || []).filter(i => !i.done).map((item, i) => ({ ...item, done: false, order: i }));
    if (pendingItems.length > 0) {
      setNextTaskId(prev => {
        const newId = prev;
        const pendingTask = {
          id: newId,
          title: `Faltou: ${task.title}`,
          description: "",
          category: task.category,
          emoji: task.emoji,
          gradient: task.gradient,
          accent: task.accent || "#2563eb",
          items: pendingItems,
        };
        setTasks(ts => [...ts, pendingTask]);
        return prev + 1;
      });
    }
    setListCompleteCtx(null);
    acceptTask(task, vel, willEmpty);
  }

  function handleListSnooze() {
    if (!listCompleteCtx) return;
    const { task } = listCompleteCtx;
    setListCompleteCtx(null);
    const snoozeUntil = computeSnoozeUntil(snoozeDefault);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, snoozeUntil } : t));
    showToast("⏰  Adiado", "bg-amber-600/90 backdrop-blur-md");
  }

  // ── Shared sub-sections ──────────────────────────────────
  const NavItems = [
    { id: "home",     label: "Início",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "social",   label: "Social",    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { id: "activity", label: "Atividade", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "profile",  label: "Perfil",    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];
  const friendsPendingBadge = social.pendingIncoming.length;






  // ════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen w-full bg-[#111114]">

      {/* ── MOBILE ── */}
      {!isDesktop && (
        <div className="flex flex-col w-full bg-[#111114] overflow-hidden" style={{ height: "100dvh" }}>
          <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 bg-[#111114]" style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
            <div><h1 className="text-[22px] font-black tracking-tight leading-none text-white">Task<span style={{ color: "#2563eb" }}>Match</span></h1><p className="text-[11px] text-white/30 mt-0.5">Decida rápido, viva mais.</p></div>
            <div className="flex items-center gap-1">
              <StreakFlame count={streak.count} onClick={() => setShowStreakDetail(true)} />
              {!auth.isLoggedIn && (
                <button onClick={() => setShowAuthModal(true)} className="px-2.5 h-9 rounded-2xl bg-[#2563eb]/15 border border-[#2563eb]/30 text-[11px] font-semibold text-[#93c5fd] hover:bg-[#2563eb]/25 transition">Entrar</button>
              )}
              <button onClick={() => setShowCreatePollModal(true)} className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center" title="Bora? — enquete de grupo"><span className="text-base leading-none">🗳️</span></button>
              <button onClick={() => setActiveTab("create")} aria-label="Criar tarefa" className="w-9 h-9 rounded-2xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            </div>
          </div>

          {/* Streak risk banner */}
          <AnimatePresence>
            {activeTab === "home" && streakAtRisk && !riskDismissed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-shrink-0 overflow-hidden">
                <div className="mx-5 mb-1 flex items-center gap-2 bg-amber-500/15 border border-amber-500/25 rounded-xl px-3.5 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-[12px] text-amber-300 flex-1 leading-snug">Seu streak de <strong>{streak.count}</strong> dias acaba à meia-noite. Decide 1 task pra manter 🔥</p>
                  <button onClick={() => setRiskDismissed(true)} aria-label="Dispensar aviso" className="text-amber-400/50 hover:text-amber-400 transition text-sm flex-shrink-0">✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === "home" && mixedRemaining > 0 && (
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/30 font-medium flex items-center gap-1.5">
                  Deck
                  {socialDeckItems.length > 0 && <span className="text-[9px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full">{socialDeckItems.length} de amigos</span>}
                </span>
                <span className="text-[11px] text-white/20 bg-white/[0.05] px-2.5 py-0.5 rounded-full">{remaining} de {total} pessoais</span>
              </div>
              <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-[#2563eb] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden relative">
            {activeTab === "home" && (
              <div className="flex flex-col h-full">
                {mixedRemaining > 0 ? (
                  <>
                    <div className="flex-1 min-h-0 px-5 pt-2 pb-2 relative"><div className="relative w-full h-full"><AnimatePresence custom={swipeExit}>{mixedDeck.slice(-3).reverse().map((task, i, arr) => { const isTop = i === 0; const stackIndex = arr.length - 1 - i; const isSelf = task._source === "self"; return (<SwipeCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleSwipe} onShare={isTop && isSelf ? setShareTask : undefined} onShareToFeed={isTop && isSelf && auth.isLoggedIn ? setShareToFeedTask : undefined} isReturned={isTop && isSelf && returnedTaskIds.has(task.id)} onOpenChecklist={isTop && isSelf ? handleOpenChecklist : undefined} />); })}</AnimatePresence></div></div>
                    <div className="flex-shrink-0 flex items-center justify-between px-8 py-2">
                      <div className="flex items-center gap-1.5 text-red-400/45"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg><span className="text-[9px] font-semibold tracking-widest uppercase">{mixedTopTask?._source === "friend" ? "Passei" : "Fazer"}</span></div>
                      <div className="flex flex-col items-center text-blue-400/45"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mb-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg><span className="text-[9px] font-semibold tracking-widest uppercase">{mixedTopTask?._source === "friend" ? "Reshare" : "Delegar"}</span></div>
                      <div className="flex items-center gap-1.5 text-emerald-400/45"><span className="text-[9px] font-semibold tracking-widest uppercase">{mixedTopTask?._source === "friend" ? "Aprovei" : "Feito"}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></div>
                    </div>
                    <div className="flex-shrink-0 flex items-center justify-center pb-4"><ActionButtons onAction={(dir) => mixedTopTask && handleSwipe(dir, mixedTopTask)} disabled={!mixedTopTask} /></div>
                  </>
                ) : (<EmptyState stats={stats} onReset={() => setActiveTab("create")} onNavigate={setActiveTab} />)}
              </div>
            )}
            {activeTab === "social" && <SocialExplore isDesktop={false} isLoggedIn={auth.isLoggedIn} userId={auth.user?.id} social={social} tasks={tasks} invites={invites} addRecipient={addRecipient} updateRecipientStatus={updateRecipientStatus} shareInvite={shareInvite} onMassSend={handleMassSend} onResendFavorites={handleResendFavorites} showToast={showToast} unreadCount={unreadCount} onCreatePoll={() => setShowCreatePollModal(true)} onShareTask={setShareTask} onRequireLogin={() => setShowAuthModal(true)} />}
            {activeTab === "activity" && (
              <ActivityTab decisions={decisions} stats={stats} streak={streak} tasks={tasks} onNavigate={setActiveTab} onWakeTask={handleWakeTask} onSnoozeMore={handleSnoozeMore} commitments={commitments} commitmentLog={commitmentLog} onLogCommitment={handleLogCommitment} onScheduleTask={handleScheduleTask} onCreateCommitment={() => setShowCreateCommitment(true)} onEditCommitment={c => setEditingCommitment(c)} onTogglePauseCommitment={handleTogglePauseCommitment} onDeleteCommitment={handleDeleteCommitment} onToggleItem={handleToggleItem} onAddItem={handleAddListItem} onCompleteChecklist={handleCompleteChecklist} onCreateChecklist={handleCreateChecklist} />
            )}
            {activeTab === "create" && (
              <CreateTaskForm
                isDesktop={false}
                newTaskData={newTaskData}
                setNewTaskData={setNewTaskData}
                imageInputRef={imageInputRef}
                onCancel={() => setActiveTab("home")}
                onSubmit={handleCreateTaskSubmit}
                canShareToFeed={auth.isLoggedIn && !!newTaskData.title.trim()}
                onShareToFeed={handleShareNewTaskToFeed}
                showToast={showToast}
              />
            )}
            {activeTab === "profile" && (
              <div className="h-full overflow-y-auto">
                <ProfileTab
                  profile={displayProfile} stats={stats} streak={streak}
                  notifSettings={notifSettings}
                  openProfileEditor={openProfileEditor}
                  setShowNotifSettings={setShowNotifSettings} setShowAboutModal={setShowAboutModal}
                  handleLogout={handleLogout}
                  clearAllData={clearAllData}
                  snoozeDefault={snoozeDefault} onSnoozeDefaultChange={setSnoozeDefault}
                />
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center border-t border-white/[0.06] bg-[#111114]" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}>
            {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center gap-1 py-3"><div className="relative"><svg viewBox="0 0 24 24" fill="none" stroke={isActive ? "#3b82f6" : "rgba(255,255,255,0.22)"} strokeWidth={isActive ? 2.2 : 1.8} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>{tab.id === "social" && <NavBadge count={unreadCount + friendsPendingBadge} />}</div><span className="text-[10px] font-medium" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.2)" }}>{tab.label}</span></button>); })}
          </div>
        </div>
      )}

      {/* ── DESKTOP ── */}
      {isDesktop && (
        <div className="w-full h-screen flex bg-[#111114]">
          <aside className="w-[220px] flex-shrink-0 bg-[#18181c] flex flex-col px-4 py-6 border-r border-white/[0.05]">
            <div className="mb-4 px-2 flex items-center justify-between"><div><h1 className="text-xl font-black tracking-tight leading-none text-white">Task<span style={{ color: "#2563eb" }}>Match</span></h1><p className="text-[11px] text-white/30 mt-1">Decida rápido, viva mais.</p></div><StreakFlame count={streak.count} onClick={() => setShowStreakDetail(true)} /></div>
            <nav className="flex flex-col gap-0.5">
              {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? "bg-[#2563eb]/15 text-[#93c5fd]" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`}><div className="relative flex-shrink-0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className="w-[17px] h-[17px]"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>{tab.id === "social" && <NavBadge count={unreadCount + friendsPendingBadge} />}</div><span className="text-[13px] font-medium">{tab.label}</span></button>); })}
            </nav>
            <div className="mt-auto pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/25 mb-1">Sessão atual</p>
              {[{ label: "Feitas", value: stats.accepted, color: "text-emerald-400" }, { label: "Delegadas", value: stats.shared, color: "text-blue-400" }, { label: "Fazer", value: stats.rejected, color: "text-red-400" }].map(({ label, value, color }) => (<div key={label} className="flex items-center justify-between"><span className="text-[12px] text-white/40">{label}</span><AnimatePresence mode="wait"><motion.span key={value} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={`text-[14px] font-semibold ${color}`}>{value}</motion.span></AnimatePresence></div>))}
              <div className="flex items-center justify-between mt-1"><span className="text-[12px] text-white/40">Taxa de conclusão</span><span className="text-[13px] font-semibold text-emerald-400">{stats.accepted + stats.rejected + stats.shared > 0 ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%` : "—"}</span></div>
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
                        <button onClick={() => setRiskDismissed(true)} aria-label="Dispensar aviso" className="text-amber-400/40 hover:text-amber-400 transition text-sm">✕</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between px-10 pt-6 pb-3 flex-shrink-0 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-white/30">Deck</span>
                    {socialDeckItems.length > 0 && <span className="text-[9px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">{socialDeckItems.length} de amigos</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {!auth.isLoggedIn && <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/15 border border-[#2563eb]/25 text-[12px] font-medium text-[#93c5fd] hover:bg-[#2563eb]/25 transition">Entrar</button>}
                    <span className="text-[11px] text-white/20 bg-white/[0.05] px-3 py-1 rounded-full">{remaining} de {total} pessoais</span>
                    <button onClick={() => setShowCreatePollModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[12px] font-medium text-purple-400 hover:bg-purple-500/30 transition">🗳️ Bora?</button>
                    <button onClick={() => setActiveTab("create")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[12px] font-medium text-[#3b82f6] hover:bg-[#2563eb]/30 transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Criar card</button>
                  </div>
                </div>
                {remaining > 0 && (<div className="px-10 pt-3 pb-1 flex-shrink-0"><div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden"><motion.div className="h-full bg-[#2563eb] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div></div>)}
                <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-6 min-h-0">
                  {mixedRemaining > 0 ? (
                    <>
                      <div className="relative w-full max-w-[520px]" style={{ height: cardHeight }}><AnimatePresence custom={swipeExit}>{mixedDeck.slice(-3).reverse().map((task, i, arr) => { const isTop = i === 0; const stackIndex = arr.length - 1 - i; const isSelf = task._source === "self"; return (<SwipeCard key={task.id} task={task} isTop={isTop} stackIndex={stackIndex} onSwipe={handleSwipe} onShare={isTop && isSelf ? setShareTask : undefined} onShareToFeed={isTop && isSelf && auth.isLoggedIn ? setShareToFeedTask : undefined} isReturned={isTop && isSelf && returnedTaskIds.has(task.id)} onOpenChecklist={isTop && isSelf ? handleOpenChecklist : undefined} />); })}</AnimatePresence></div>
                      <div className="flex items-center justify-between w-full max-w-[520px] px-2">
                        <div className="flex items-center gap-1.5 text-red-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg><span className="text-[10px] font-semibold tracking-widest uppercase">{mixedTopTask?._source === "friend" ? "Passei" : "Fazer"}</span></div>
                        <div className="flex flex-col items-center text-blue-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 mb-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg><span className="text-[10px] font-semibold tracking-widest uppercase">{mixedTopTask?._source === "friend" ? "Reshare" : "Delegar"}</span></div>
                        <div className="flex items-center gap-1.5 text-emerald-400/50"><span className="text-[10px] font-semibold tracking-widest uppercase">{mixedTopTask?._source === "friend" ? "Aprovei" : "Feito"}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></div>
                      </div>
                      <ActionButtons onAction={(dir) => mixedTopTask && handleSwipe(dir, mixedTopTask)} disabled={!mixedTopTask} />
                    </>
                  ) : (<EmptyState stats={stats} onReset={() => setActiveTab("create")} onNavigate={setActiveTab} />)}
                </div>
              </>
            )}
            {activeTab === "social" && <SocialExplore isDesktop={true} isLoggedIn={auth.isLoggedIn} userId={auth.user?.id} social={social} tasks={tasks} invites={invites} addRecipient={addRecipient} updateRecipientStatus={updateRecipientStatus} shareInvite={shareInvite} onMassSend={handleMassSend} onResendFavorites={handleResendFavorites} showToast={showToast} unreadCount={unreadCount} onCreatePoll={() => setShowCreatePollModal(true)} onShareTask={setShareTask} onRequireLogin={() => setShowAuthModal(true)} />}
            {activeTab === "activity" && (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <ActivityTab decisions={decisions} stats={stats} streak={streak} tasks={tasks} onNavigate={setActiveTab} onWakeTask={handleWakeTask} onSnoozeMore={handleSnoozeMore} commitments={commitments} commitmentLog={commitmentLog} onLogCommitment={handleLogCommitment} onScheduleTask={handleScheduleTask} onCreateCommitment={() => setShowCreateCommitment(true)} onEditCommitment={c => setEditingCommitment(c)} onTogglePauseCommitment={handleTogglePauseCommitment} onDeleteCommitment={handleDeleteCommitment} onToggleItem={handleToggleItem} onAddItem={handleAddListItem} onCompleteChecklist={handleCompleteChecklist} onCreateChecklist={handleCreateChecklist} />
                </div>
              </div>
            )}
            {activeTab === "create" && (
              <CreateTaskForm
                isDesktop={true}
                newTaskData={newTaskData}
                setNewTaskData={setNewTaskData}
                imageInputRef={imageInputRef}
                onCancel={() => setActiveTab("home")}
                onSubmit={handleCreateTaskSubmit}
                canShareToFeed={auth.isLoggedIn && !!newTaskData.title.trim()}
                onShareToFeed={handleShareNewTaskToFeed}
                showToast={showToast}
              />
            )}
            {activeTab === "profile" && (
              <div className="flex flex-1 flex-col items-center overflow-y-auto">
                <div className="w-full max-w-[900px]">
                  <ProfileTab
                    profile={displayProfile} stats={stats} streak={streak}
                    notifSettings={notifSettings}
                    openProfileEditor={openProfileEditor}
                    setShowNotifSettings={setShowNotifSettings} setShowAboutModal={setShowAboutModal}
                    handleLogout={handleLogout}
                    clearAllData={clearAllData} isDesktop={true}
                    snoozeDefault={snoozeDefault} onSnoozeDefaultChange={setSnoozeDefault}
                  />
                </div>
              </div>
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

      {pendingSnoozeTask && (
        <SnoozeSetupModal onChoose={(pref) => handleSnoozeChoice(pref, pendingSnoozeTask)} />
      )}

      <AnimatePresence>
        {checklistTaskId && (() => {
          const t = tasks.find(t => t.id === checklistTaskId);
          return t ? (
            <ChecklistModal
              key="checklist"
              task={t}
              onClose={() => setChecklistTaskId(null)}
              onToggleItem={handleToggleItem}
              onAddItem={handleAddListItem}
            />
          ) : null;
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {listCompleteCtx && (
          <ListCompleteModal
            key="list-complete"
            task={listCompleteCtx.task}
            onCompleteAnyway={handleListCompleteAnyway}
            onCreatePending={handleListCreatePending}
            onSnooze={handleListSnooze}
          />
        )}
      </AnimatePresence>

      {auth.needsProfile && (
        <SetupProfile onCreate={auth.createProfile} onCheckUsername={auth.checkUsername} localProfile={profile} />
      )}

      <AnimatePresence>
        {(showCreateCommitment || editingCommitment) && (
          <CommitmentFormModal
            key="cfm"
            initial={editingCommitment}
            onSave={handleSaveCommitment}
            onClose={() => { setShowCreateCommitment(false); setEditingCommitment(null); }}
            isDesktop={isDesktop}
          />
        )}
        {showCreatePollModal && (
          <CreatePollModal key="cpm" onClose={() => setShowCreatePollModal(false)} userId={auth.user?.id ?? null} showToast={showToast} isDesktop={isDesktop} />
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
          <TaskShareModal key="tsm" task={shareTask} handle={displayProfile.handle} onClose={() => setShareTask(null)} />
        )}
        {shareToFeedTask && (
          <ShareToFeedModal
            key="stfm"
            task={shareToFeedTask}
            onShare={social.shareTask}
            onClose={() => setShareToFeedTask(null)}
          />
        )}
        {showAuthModal && !auth.isLoggedIn && (
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="bg-[#18181c] rounded-3xl w-full max-w-sm border border-white/10 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <h3 className="font-bold text-white text-base">Entrar no TaskMatch</h3>
                <button onClick={() => setShowAuthModal(false)} aria-label="Fechar" className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition text-sm">✕</button>
              </div>
              <AuthScreen onSendLink={auth.sendMagicLink} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {showProfileEditor && (
        <div className={`fixed inset-0 z-50 flex bg-black/60 px-4 ${!isDesktop ? "items-end pb-6" : "items-center justify-center"}`}>
          <div className="w-full max-w-md rounded-[28px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold text-white">Editar perfil</div><div className="text-[12px] text-white/40">Atualize nome, nick e emoji.</div></div><button type="button" onClick={closeProfileEditor} aria-label="Fechar" className="text-white/40 hover:text-white text-lg">✕</button></div>
            <div className="flex justify-center mb-4"><div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 text-4xl flex items-center justify-center">{editedProfile.avatar}</div></div>
            <div className="space-y-3 mb-4">
              <input value={editedProfile.name} onChange={(e) => setEditedProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Seu nome" className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]" />
              <div>
                <input value={editedProfile.handle} onChange={(e) => setEditedProfile((p) => ({ ...p, handle: e.target.value }))} placeholder="@nick" className={`w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border ${
                  auth.isLoggedIn && editorUsernameStatus === "available" ? "border-emerald-500/50"
                  : auth.isLoggedIn && (editorUsernameStatus === "taken" || editorUsernameStatus === "invalid") ? "border-red-500/50"
                  : "border-transparent focus:border-[#2563eb]"
                }`} />
                {auth.isLoggedIn && <div className="mt-1.5"><UsernameHint status={editorUsernameStatus} value={editedProfile.handle} /></div>}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-4">{profileEmojis.map((emoji) => (<button key={emoji} type="button" onClick={() => setEditedProfile((p) => ({ ...p, avatar: emoji }))} className={`rounded-xl p-2.5 text-lg transition ${editedProfile.avatar === emoji ? "border border-[#2563eb] bg-[#2563eb]/20" : "bg-white/[0.04]"}`}>{emoji}</button>))}</div>
            {profileEditError && <p className="text-[12px] text-red-400 px-1 mb-3">{profileEditError}</p>}
            <div className="flex gap-3"><button type="button" onClick={closeProfileEditor} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/70">Cancelar</button><button type="button" onClick={saveProfileEdits} disabled={savingProfile || (auth.isLoggedIn && editorUsernameStatus !== "available")} className="flex-1 rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center">{savingProfile ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Salvar"}</button></div>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className={`fixed inset-0 z-50 flex bg-black/60 px-4 ${!isDesktop ? "items-end pb-6" : "items-center justify-center"}`}>
          <div className="w-full max-w-sm rounded-[28px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold text-white">Sobre o TaskMatch</div><div className="text-[12px] text-white/40">Informações do app</div></div><button type="button" onClick={() => setShowAboutModal(false)} aria-label="Fechar" className="text-white/40 hover:text-white text-lg">✕</button></div>
            <div className="space-y-3 text-sm text-white/60 mb-5"><div><div className="text-white font-semibold">TaskMatch</div><div className="text-[12px] text-white/35">Versão 0.0.0</div></div><p>App dark minimalista para tomar decisões rápidas e organizar seu dia com foco em ação.</p></div>
            <button type="button" onClick={() => setShowAboutModal(false)} className="w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white">Fechar</button>
          </div>
        </div>
      )}

      {showNotifSettings && (
        <div className={`fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm px-4 ${!isDesktop ? "items-end pb-6" : "items-center justify-center"}`}>
          <div className="w-full max-w-sm rounded-[28px] bg-[#18191f] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <div><p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-0.5">Configurar</p><h3 className="text-base font-bold text-white">Notificações</h3></div>
              <button type="button" onClick={() => setShowNotifSettings(false)} aria-label="Fechar" className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-3.5">
                <span className="text-xl">🔔</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white">Ativar notificações</p><p className="text-[11px] text-white/35 mt-0.5">Permissão no browser necessária</p></div>
                <IOSToggle value={notifSettings.enabled} onChange={handleEnableNotifs} disabled={!("Notification" in window)} />
              </div>
              {(notifSettings.permission === "denied" || ("Notification" in window && Notification.permission === "denied")) && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-[12px] text-red-300 font-medium mb-0.5">Permissão bloqueada</p>
                  <p className="text-[11px] text-red-300/70">Acesse as configurações do browser e permita notificações para este site manualmente.</p>
                </div>
              )}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.05]">
                {[
                  { key: "peakReminder",  icon: "⚡", label: "Lembrete no meu horário",         sub: "Avisa quando chega seu horário de pico" },
                  { key: "streakAlert",   icon: "🔥", label: "Aviso de streak em risco",         sub: "Após 19h se você ainda não decidiu hoje" },
                  { key: "inviteReplies", icon: "✉️", label: "Quando responderem meus convites", sub: "Ping imediato a cada resposta" },
                ].map(({ key, icon, label, sub }) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0"><p className={`text-[13px] font-medium ${notifSettings.enabled ? "text-white" : "text-white/35"}`}>{label}</p><p className="text-[11px] text-white/25 mt-0.5">{sub}</p></div>
                    <IOSToggle value={notifSettings[key]} onChange={v => setNotifSettings(s => ({ ...s, [key]: v }))} disabled={!notifSettings.enabled} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/20 text-center leading-relaxed px-2">Funciona com o app aberto. Para notificações em segundo plano, seria necessário integrar Push API + service worker.</p>
            </div>
          </div>
        </div>
      )}

      <Toast visible={toast.visible} message={toast.message} color={toast.color} />
    </div>
  );
}