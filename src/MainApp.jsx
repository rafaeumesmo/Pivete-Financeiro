import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "./hooks/useAuth.js";
import { useSocial } from "./hooks/useSocial.js";
import { useSplits } from "./hooks/useSplits.js";
import { useCobrancas } from "./hooks/useCobrancas.js";
import { useUsernameStatus } from "./hooks/useUsernameStatus.js";
import { UsernameHint } from "./components/UsernameHint.jsx";
import { normalizeUsername } from "./lib/username.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { SetupProfile } from "./components/SetupProfile.jsx";
import { SocialExplore } from "./components/SocialExplore.jsx";
import { CreatePollModal } from "./components/CreatePollModal.jsx";
import { migrateAnonPolls } from "./lib/polls.js";
import { todayKey, daysBetween, addDays } from "./lib/dates.js";
import { ActivityTab } from "./components/ActivityTab.jsx";
import { ProfileTab } from "./components/ProfileTab.jsx";
import { NovoLancamentoForm } from "./components/NovoLancamentoForm.jsx";
import { Toast } from "./components/Toast.jsx";
import { NavBadge } from "./components/NavBadge.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { StreakFlame, StreakDetailModal, StreakBrokenModal } from "./components/StreakWidgets.jsx";
import { IOSToggle } from "./components/IOSToggle.jsx";
import { FinDeck } from "./components/FinDeck.jsx";
import { Brand } from "./components/Brand.jsx";
import { useFinance, CONTA_INICIAL } from "./hooks/useFinance.js";
import { DEFAULT_CATEGORIAS } from "./lib/categories.js";
import { SK, load, save, usePersistedState } from "./lib/storage.js";
import { formatBRL } from "./lib/money.js";
import { APP_NAME, APP_TAGLINE } from "./config.js";
import { avaliarConquistas, CONQUISTAS } from "./lib/conquistas.js";

// Anti-spam keys for notifications (1 dispatch per type per day)
const NOTIF_LAST_PEAK   = "fin_notif_last_peak";
const NOTIF_LAST_STREAK = "fin_notif_last_streak";

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
      notify("Hora de olhar as contas 💸", "Tem lançamento esperando no deck.", "peak-reminder");
      localStorage.setItem(NOTIF_LAST_PEAK, today);
    }
  }
  if (settings.streakAlert) {
    const s = load(SK.streak, { count: 0, lastActiveDate: null });
    if (s.count > 0 && nowH >= 19 && localStorage.getItem(NOTIF_LAST_STREAK) !== today) {
      if (s.lastActiveDate === addDays(today, -1)) {
        notify(`Seu streak de ${s.count} dias acaba à meia-noite 🔥`, "Registre ou revise 1 lançamento pra manter!", "streak-alert");
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
export default function MainApp() {
  const prefersReducedMotion = useReducedMotion();
  // Estados persistidos — sobrevivem ao reload
  const finance = useFinance();
  const [stats,     setStats]     = usePersistedState(SK.stats,   { accepted: 0, rejected: 0, shared: 0 });
  const [profile,   setProfile]   = usePersistedState(SK.profile, { name: "Seu Nome", handle: "@voce", avatar: "👤" });
  const [_decisions, setDecisions] = usePersistedState(SK.decisions, []); // histórico imutável
  const [streak,        setStreak]        = usePersistedState(SK.streak, { count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
  const [reservaMeses,  setReservaMeses]  = usePersistedState(SK.reservaMeses, 6);
  const [conquistas,    setConquistas]    = usePersistedState(SK.conquistas, {});
  const [notifSettings, setNotifSettings] = usePersistedState(SK.notifs, { enabled: false, peakReminder: true, streakAlert: true, permission: "default" });

  // ── Camada social (Supabase) ──────────────────────────────
  const auth   = useAuth();
  const social = useSocial(auth.user?.id);
  const splits = useSplits(auth.user?.id);
  const cob    = useCobrancas(finance);

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
  const [showAuthModal,      setShowAuthModal]      = useState(false);

  // Estados voláteis — resetam no reload (intencionalmente)
  const [toast,             setToast]             = useState({ visible: false, message: "", color: "" });
  const [activeTab,         setActiveTab]         = useState("home");
  const [socialTab,         setSocialTab]         = useState("cobrancas"); // sub-aba inicial ao abrir o Social
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
  const [showOnboarding,    setShowOnboarding]    = useState(() => !load(SK.onboarded, false));
  const [showStreakDetail,  setShowStreakDetail]  = useState(false);
  const [streakBroken,     setStreakBroken]      = useState(null); // null | { oldCount, hasFreeze }
  const [riskDismissed,    setRiskDismissed]     = useState(false);
  const [snoozeDefault,    setSnoozeDefault]     = usePersistedState(SK.snoozeDefault, "1d");
  const [snoozeAsked,      setSnoozeAsked]       = usePersistedState(SK.snoozeAsked, false);
  const [showCreatePollModal,  setShowCreatePollModal]  = useState(false);
  const [showNotifSettings,    setShowNotifSettings]    = useState(false);

  const profileEmojis = ["😎", "🚀", "⚡", "🎯", "🔥", "💡", "🧠", "✅", "🏆", "👾"];

  useEffect(() => { function h() { setIsDesktop(window.innerWidth >= 1024); } window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  useEffect(() => {
    if (activeTab !== "social") setSocialTab("cobrancas");
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

  // Run notification check once on app open
  useEffect(() => { checkNotifications(); }, []);
  // Periodic check every 5min while notifications are enabled
  useEffect(() => {
    if (!notifSettings.enabled) return;
    const id = setInterval(checkNotifications, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [notifSettings.enabled]);

  // Conquistas: reavalia quando os dados mudam; as novas ficam gravadas com
  // a data e ganham um toast. Uma vez desbloqueada, não some.
  useEffect(() => {
    const ids = avaliarConquistas({
      lancamentos: finance.lancamentos, dividas: finance.dividas, metas: finance.metas, revisoes: finance.revisoes,
      recorrentes: finance.recorrentes, streak, reservaMeses, hoje: todayKey(),
    });
    const novas = ids.filter(id => !conquistas[id]);
    if (!novas.length) return;
    const agora = new Date().toISOString();
    setConquistas(prev => ({ ...prev, ...Object.fromEntries(novas.map(id => [id, agora])) }));
    const q = CONQUISTAS.find(x => x.id === novas[0]);
    setTimeout(() => showToast(`${q.icon} Conquista: ${q.nome} · +${q.xp} XP`, "bg-amber-600/90 backdrop-blur-md"), 900);
  }, [finance.lancamentos, finance.dividas, finance.metas, finance.revisoes, finance.recorrentes, streak, reservaMeses]); // eslint-disable-line react-hooks/exhaustive-deps


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
      showToast("Armazenamento cheio — novas alterações podem não estar sendo salvas. Libere espaço no dispositivo.", "bg-red-600/90");
    }
    window.addEventListener("fin:storage-error", onStorageError);
    return () => window.removeEventListener("fin:storage-error", onStorageError);
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
    setStreak((s) => ({ ...s, lastActiveDate: addDays(todayKey(), -1), freezesAvailable: Math.max(0, s.freezesAvailable - 1) }));
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
    if (!window.confirm(`Deseja sair do ${APP_NAME}?`)) return;
    if (auth.isLoggedIn) { auth.signOut(); showToast("Sessão encerrada.", "bg-white/10"); }
    else showToast("Não há sessão ativa.", "bg-white/10");
  }

  function clearAllData() {
    if (!window.confirm("Apagar todos os dados? Lançamentos, contas, dívidas, caixinhas e histórico serão removidos deste aparelho.")) return;
    [...Object.values(SK), NOTIF_LAST_PEAK, NOTIF_LAST_STREAK].forEach((key) => { try { localStorage.removeItem(key); } catch {} });
    finance.setLancamentos([]);
    finance.setRecorrentes([]);
    finance.setDividas([]);
    finance.setContas([CONTA_INICIAL]);
    finance.setMetas([]);
    finance.setCategorias(DEFAULT_CATEGORIAS);
    finance.setRevisoes({});
    setConquistas({});
    setReservaMeses(6);
    setStats({ accepted: 0, rejected: 0, shared: 0 });
    cob.setCobrancas([]);
    setDecisions([]);
    setStreak({ count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
    setNotifSettings({ enabled: false, peakReminder: true, streakAlert: true, permission: "default" });
    showToast("Dados apagados.", "bg-red-600/90");
  }

  function handleCriarLancamento(data) {
    finance.criarLancamento(data);
    registerActivity();
    const extra = data.recorrente ? " · fixo" : data.parcelas ? ` · ${data.parcelas}x` : "";
    showToast(`✓ ${data.tipo === "entrada" ? "Entrada" : "Saída"} de ${formatBRL(data.valor)} salva${extra}`, "bg-emerald-600/90");
    setActiveTab("home");
  }

  // Ao logar, vincula as enquetes criadas anonimamente à conta.
  useEffect(() => {
    if (auth.user?.id) migrateAnonPolls(auth.user.id).catch(() => {});
  }, [auth.user?.id]);

  // ── Callbacks do deck financeiro ─────────────────────────
  function handleDecision(decision) {
    const key = { right: "accepted", left: "rejected", up: "shared" }[decision.direction];
    if (key) setStats((s) => ({ ...s, [key]: (s[key] || 0) + 1 }));
    setDecisions((prev) => [decision, ...prev].slice(0, 200));
    setRiskDismissed(true); // banner some após a primeira decisão do dia
  }

  // Conta dividida no deck: vira uma cobrança local com link pra mandar pra
  // quem vai pagar a parte (Social → Cobranças).
  function handleDividido(l) {
    cob.criar(l);
    setSocialTab("cobrancas");
    setActiveTab("social");
  }

  function handleQuitouDivida(l) {
    showToast(`🏆 Dívida quitada: ${l.descricao}!`, "bg-emerald-600/90 backdrop-blur-md");
    if (!prefersReducedMotion) fireDeckCompleteConfetti();
  }

  // Pagamento feito fora do deck (Calendário) ou aporte em caixinha: conta
  // como atividade do dia pro streak.
  function handlePagoFora(l, r = {}) {
    registerActivity();
    if (l) handleDecision({ id: Date.now(), lancamentoId: l.id, title: l.descricao, valor: l.valor, categoria: l.categoria, direction: "right", label: l.tipo === "entrada" ? "Recebi" : "Paguei", decidedAt: new Date().toISOString() });
    if (r.quitouDivida) handleQuitouDivida(l);
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
            <div><h1 className="text-[22px] font-black tracking-tight leading-none text-white"><Brand /></h1><p className="text-[11px] text-white/30 mt-0.5 whitespace-nowrap max-[400px]:hidden">{APP_TAGLINE}</p></div>
            <div className="flex items-center gap-1">
              <StreakFlame count={streak.count} onClick={() => setShowStreakDetail(true)} />
              {!auth.isLoggedIn && (
                <button onClick={() => setShowAuthModal(true)} className="px-2.5 h-9 rounded-2xl bg-[#2563eb]/15 border border-[#2563eb]/30 text-[11px] font-semibold text-[#93c5fd] hover:bg-[#2563eb]/25 transition">Entrar</button>
              )}
              <button onClick={() => setShowCreatePollModal(true)} className="w-9 h-9 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center" title="Bora? — enquete de grupo"><span className="text-base leading-none">🗳️</span></button>
              <button onClick={() => setActiveTab("create")} aria-label="Novo lançamento" className="w-9 h-9 rounded-2xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></button>
            </div>
          </div>

          {/* Streak risk banner */}
          <AnimatePresence>
            {activeTab === "home" && streakAtRisk && !riskDismissed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex-shrink-0 overflow-hidden">
                <div className="mx-5 mb-1 flex items-center gap-2 bg-amber-500/15 border border-amber-500/25 rounded-xl px-3.5 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-[12px] text-amber-300 flex-1 leading-snug">Seu streak de <strong>{streak.count}</strong> dias acaba à meia-noite. Registre ou revise 1 lançamento pra manter 🔥</p>
                  <button onClick={() => setRiskDismissed(true)} aria-label="Dispensar aviso" className="text-amber-400/50 hover:text-amber-400 transition text-sm flex-shrink-0">✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-0 overflow-hidden relative">
            {activeTab === "home" && <FinDeck isDesktop={false} finance={finance} snoozeDefault={snoozeDefault} setSnoozeDefault={setSnoozeDefault} snoozeAsked={snoozeAsked} setSnoozeAsked={setSnoozeAsked} keyboardEnabled={activeTab === "home" && !showOnboarding && !showAuthModal && !streakBroken} onActivity={registerActivity} onDecision={handleDecision} onDividido={handleDividido} onQuitouDivida={handleQuitouDivida} onDeckComplete={() => { if (!prefersReducedMotion) fireDeckCompleteConfetti(); }} onNavigate={setActiveTab} showToast={showToast} stats={stats} />}
            {activeTab === "social" && <SocialExplore isDesktop={false} isLoggedIn={auth.isLoggedIn} userId={auth.user?.id} social={social} splits={splits} cob={cob} finance={finance} nome={displayProfile.name} showToast={showToast} onCreatePoll={() => setShowCreatePollModal(true)} onRequireLogin={() => setShowAuthModal(true)} initialTab={socialTab} />}
            {activeTab === "activity" && (
              <ActivityTab finance={finance} showToast={showToast} onPago={handlePagoFora} />
            )}
            {activeTab === "create" && (
              <NovoLancamentoForm
                isDesktop={false}
                categorias={finance.categorias}
                contas={finance.contas}
                contaPadrao={finance.contaPadrao}
                onCancel={() => setActiveTab("home")}
                onSubmit={handleCriarLancamento}
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
                  finance={finance} conquistas={conquistas} reservaMeses={reservaMeses} setReservaMeses={setReservaMeses} onNavigate={setActiveTab} showToast={showToast}
                />
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center border-t border-white/[0.06] bg-[#111114]" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}>
            {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center gap-1 py-3"><div className="relative"><svg viewBox="0 0 24 24" fill="none" stroke={isActive ? "#3b82f6" : "rgba(255,255,255,0.22)"} strokeWidth={isActive ? 2.2 : 1.8} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>{tab.id === "social" && <NavBadge count={friendsPendingBadge} />}</div><span className="text-[10px] font-medium" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.2)" }}>{tab.label}</span></button>); })}
          </div>
        </div>
      )}

      {/* ── DESKTOP ── */}
      {isDesktop && (
        <div className="w-full h-screen flex bg-[#111114]">
          <aside className="w-[220px] flex-shrink-0 bg-[#18181c] flex flex-col px-4 py-6 border-r border-white/[0.05]">
            <div className="mb-4 px-2 flex items-center justify-between"><div><h1 className="text-xl font-black tracking-tight leading-none text-white"><Brand /></h1><p className="text-[11px] text-white/30 mt-1 leading-snug">{APP_TAGLINE}</p></div><StreakFlame count={streak.count} onClick={() => setShowStreakDetail(true)} /></div>
            <nav className="flex flex-col gap-0.5">
              {NavItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? "bg-[#2563eb]/15 text-[#93c5fd]" : "text-white/40 hover:bg-white/5 hover:text-white/60"}`}><div className="relative flex-shrink-0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className="w-[17px] h-[17px]"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>{tab.id === "social" && <NavBadge count={friendsPendingBadge} />}</div><span className="text-[13px] font-medium">{tab.label}</span></button>); })}
            </nav>
            <div className="mt-auto pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/25 mb-1">Decisões no deck</p>
              {[{ label: "Pagas", value: stats.accepted, color: "text-emerald-400" }, { label: "Divididas", value: stats.shared, color: "text-blue-400" }, { label: "Adiadas", value: stats.rejected, color: "text-amber-400" }].map(({ label, value, color }) => (<div key={label} className="flex items-center justify-between"><span className="text-[12px] text-white/40">{label}</span><AnimatePresence mode="wait"><motion.span key={value} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={`text-[14px] font-semibold ${color}`}>{value}</motion.span></AnimatePresence></div>))}
              <div className="flex items-center justify-between mt-1"><span className="text-[12px] text-white/40">Pagas sem adiar</span><span className="text-[13px] font-semibold text-emerald-400">{stats.accepted + stats.rejected + stats.shared > 0 ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%` : "—"}</span></div>
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
                        <p className="text-[12px] text-amber-300 flex-1">Seu streak de <strong>{streak.count}</strong> dias acaba à meia-noite. Registre ou revise 1 lançamento pra manter 🔥</p>
                        <button onClick={() => setRiskDismissed(true)} aria-label="Dispensar aviso" className="text-amber-400/40 hover:text-amber-400 transition text-sm">✕</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-end gap-3 px-10 pt-5 flex-shrink-0">
                  {!auth.isLoggedIn && <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/15 border border-[#2563eb]/25 text-[12px] font-medium text-[#93c5fd] hover:bg-[#2563eb]/25 transition">Entrar</button>}
                  <button onClick={() => setShowCreatePollModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[12px] font-medium text-purple-400 hover:bg-purple-500/30 transition">🗳️ Bora?</button>
                  <button onClick={() => setActiveTab("create")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[12px] font-medium text-[#3b82f6] hover:bg-[#2563eb]/30 transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Novo lançamento</button>
                </div>
                <div className="flex-1 min-h-0"><FinDeck isDesktop={true} finance={finance} snoozeDefault={snoozeDefault} setSnoozeDefault={setSnoozeDefault} snoozeAsked={snoozeAsked} setSnoozeAsked={setSnoozeAsked} keyboardEnabled={activeTab === "home" && !showOnboarding && !showAuthModal && !streakBroken} onActivity={registerActivity} onDecision={handleDecision} onDividido={handleDividido} onQuitouDivida={handleQuitouDivida} onDeckComplete={() => { if (!prefersReducedMotion) fireDeckCompleteConfetti(); }} onNavigate={setActiveTab} showToast={showToast} stats={stats} /></div>
              </>
            )}
            {activeTab === "social" && <SocialExplore isDesktop={true} isLoggedIn={auth.isLoggedIn} userId={auth.user?.id} social={social} splits={splits} cob={cob} finance={finance} nome={displayProfile.name} showToast={showToast} onCreatePoll={() => setShowCreatePollModal(true)} onRequireLogin={() => setShowAuthModal(true)} initialTab={socialTab} />}
            {activeTab === "activity" && (
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <ActivityTab finance={finance} showToast={showToast} onPago={handlePagoFora} />
                </div>
              </div>
            )}
            {activeTab === "create" && (
              <NovoLancamentoForm
                isDesktop={true}
                categorias={finance.categorias}
                contas={finance.contas}
                contaPadrao={finance.contaPadrao}
                onCancel={() => setActiveTab("home")}
                onSubmit={handleCriarLancamento}
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
                  finance={finance} conquistas={conquistas} reservaMeses={reservaMeses} setReservaMeses={setReservaMeses} onNavigate={setActiveTab} showToast={showToast}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {showOnboarding && (
        <Onboarding
          onFinish={(comExemplo) => {
            save(SK.onboarded, true);
            setShowOnboarding(false);
            if (comExemplo) { finance.carregarExemplo(); showToast("Dados de exemplo carregados — apague quando quiser no Perfil", "bg-blue-600/90"); }
          }}
        />
      )}

      {auth.needsProfile && (
        <SetupProfile onCreate={auth.createProfile} onCheckUsername={auth.checkUsername} localProfile={profile} />
      )}

      <AnimatePresence>
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
                <h3 className="font-bold text-white text-base">Entrar no {APP_NAME}</h3>
                <button onClick={() => setShowAuthModal(false)} aria-label="Fechar" className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition text-sm">✕</button>
              </div>
              <AuthScreen onSendLink={auth.sendMagicLink} onGoogle={auth.signInWithGoogle} />
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
            <div className="flex items-center justify-between mb-4"><div><div className="text-sm font-semibold text-white">Sobre o {APP_NAME}</div><div className="text-[12px] text-white/40">Informações do app</div></div><button type="button" onClick={() => setShowAboutModal(false)} aria-label="Fechar" className="text-white/40 hover:text-white text-lg">✕</button></div>
            <div className="space-y-3 text-sm text-white/60 mb-5"><div><div className="text-white font-semibold">{APP_NAME}</div><div className="text-[12px] text-white/35">Versão 0.0.0</div></div><p>Organização financeira pessoal no ritmo do swipe: pague, adie ou divida cada conta em um gesto. Seus dados ficam neste aparelho.</p></div>
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
                  { key: "peakReminder",  icon: "⚡", label: "Lembrete no meu horário",         sub: "No horário em que você costuma revisar as contas" },
                  { key: "streakAlert",   icon: "🔥", label: "Aviso de streak em risco",         sub: "Após 19h se você ainda não registrou nada hoje" },
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