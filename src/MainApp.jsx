import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "./hooks/useAuth.js";
import { useSocial } from "./hooks/useSocial.js";
import { usePublishProfileStats } from "./hooks/useProfileStats.js";
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
import { startSync, stopSync, finishSync, limparAparelho, MESCLADO_EVENT } from "./lib/sync.js";
import { resumoTexto, duplicadoTexto, SALDO_MANTIDO_TEXTO } from "./lib/mesclar.js";
import { registrarDiaUso, deveAvisarConta, MOTIVOS_CONTA } from "./lib/convidado.js";
import { todayKey, daysBetween, addDays } from "./lib/dates.js";
import { ActivityTab } from "./components/ActivityTab.jsx";
import { ProfileTab } from "./components/ProfileTab.jsx";
import { NovoLancamentoForm } from "./components/NovoLancamentoForm.jsx";
import { Toast } from "./components/Toast.jsx";
import { Onboarding } from "./components/Onboarding.jsx";
import { StreakFlame, StreakDetailModal, StreakBrokenModal } from "./components/StreakWidgets.jsx";
import { IOSToggle } from "./components/IOSToggle.jsx";
import { Sidebar, BottomNav } from "./components/AppNav.jsx";
import { RecentActivity } from "./components/RecentActivity.jsx";
import { DecisoesCard } from "./components/DecisoesCard.jsx";
import { btnCls, inputCls } from "./components/ui.jsx";
import { Sheet } from "./components/Sheet.jsx";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { ICON_STROKE } from "./lib/icons.js";
import { Plus, Vote, X, LogIn, TriangleAlert, Bell, Zap, Flame, Smartphone, Wallet } from "lucide-react";
import { FinDeck } from "./components/FinDeck.jsx";
import { Brand } from "./components/Brand.jsx";
import { useFinance, CONTA_INICIAL } from "./hooks/useFinance.js";
import { DEFAULT_CATEGORIAS } from "./lib/categories.js";
import { SK, load, usePersistedState } from "./lib/storage.js";
import { formatBRL } from "./lib/money.js";
import { decisoesDoMes } from "./lib/finance.js";
import { APP_NAME, AVATAR_EMOJIS, AVATAR_PADRAO } from "./config.js";
import { Avatar } from "./components/Avatar.jsx";
import { avaliarConquistas, CONQUISTAS, nivel, xpTotal } from "./lib/conquistas.js";

// Anti-spam keys for notifications (1 dispatch per type per day)
const NOTIF_LAST_PEAK   = "fin_notif_last_peak";
const NOTIF_LAST_STREAK = "fin_notif_last_streak";

// ── Notification helpers ──────────────────────────────────────
// NOTE: Notifications only fire while the app is open. The PWA service worker
// only precaches assets — there is no Push API integration, so it cannot wake a
// closed app. To evolve: PushManager.subscribe() + server-side Web Push
// (Supabase edge function or similar) handled in the SW's 'push' event.
function calcPeakHour(decisions) {
  if (decisions.length < 5) return 9; // fallback
  const counts = new Array(24).fill(0);
  for (const d of decisions) { try { counts[new Date(d.decidedAt).getHours()]++; } catch {} }
  return counts.indexOf(Math.max(...counts));
}
function notify(title, body, tag) {
  if (Notification.permission !== "granted") return;
  const opts = { body, tag, icon: "/icon-192.png", badge: "/badge.png" };
  // Installed PWAs on Android reject `new Notification()` — go through the SW when there is one.
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts)).catch(() => {});
    return;
  }
  try { new Notification(title, opts); } catch {}
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
      notify("Hora de olhar as contas", "Tem lançamento esperando no deck.", "peak-reminder");
      localStorage.setItem(NOTIF_LAST_PEAK, today);
    }
  }
  if (settings.streakAlert) {
    const s = load(SK.streak, { count: 0, lastActiveDate: null });
    if (s.count > 0 && nowH >= 19 && localStorage.getItem(NOTIF_LAST_STREAK) !== today) {
      if (s.lastActiveDate === addDays(today, -1)) {
        notify(`Sua sequência de ${s.count} dias acaba à meia-noite`, "Registre ou revise 1 lançamento pra manter!", "streak-alert");
        localStorage.setItem(NOTIF_LAST_STREAK, today);
      }
    }
  }
}

function fireDeckCompleteConfetti() {
  try {
    const colors = ["#1F3FD6", "#16A34A", "#F59E0B"];
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
  const [profile,   setProfile]   = usePersistedState(SK.profile, { name: "Seu Nome", handle: "@voce", avatar: AVATAR_PADRAO });
  const [decisions, setDecisions] = usePersistedState(SK.decisions, []); // histórico imutável
  const [streak,        setStreak]        = usePersistedState(SK.streak, { count: 0, best: 0, lastActiveDate: null, freezesAvailable: 1 });
  const [reservaMeses,  setReservaMeses]  = usePersistedState(SK.reservaMeses, 6);
  const [conquistas,    setConquistas]    = usePersistedState(SK.conquistas, {});
  const [notifSettings, setNotifSettings] = usePersistedState(SK.notifs, { enabled: false, peakReminder: true, streakAlert: true, permission: "default" });

  // ── Camada social (Supabase) ──────────────────────────────
  // Números do deck (pagas/adiadas/divididas) são do mês atual; `stats` segue
  // acumulado só pro XP do perfil.
  const statsMes = decisoesDoMes(decisions, finance.lancamentos, todayKey().slice(0, 7));

  const auth   = useAuth();
  const social = useSocial(auth.user?.id);
  // Lado público do perfil → profile_stats (só amigos leem). Precisa do perfil
  // criado (FK pra profiles). Mesmo cálculo de nível do ProfileTab.
  usePublishProfileStats(auth.profile ? auth.user?.id : null, {
    nivel: nivel(xpTotal(stats.accepted + stats.rejected + stats.shared, conquistas)).nivel,
    ofensiva: streak.count,
    conquistas,
  });
  const splits = useSplits(auth.user?.id);
  const cob    = useCobrancas(finance);

  // Aviso discreto pro convidado (lib/convidado.js): conta dias de uso.
  const [diasUso, setDiasUso] = usePersistedState(SK.diasUso, []);
  const [avisoContaDispensado, setAvisoContaDispensado] = usePersistedState(SK.avisoContaDispensado, null);
  useEffect(() => { setDiasUso((d) => registrarDiaUso(d, todayKey())); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- setter estável, roda no mount
  const avisarConta = !auth.isLoading && deveAvisarConta({ logado: auth.isLoggedIn, diasUso, dispensadoEm: avisoContaDispensado, hoje: todayKey() });

  // Perfil efetivo da UI: logado → tabela "profiles" do Supabase é a fonte de
  // verdade; deslogado → perfil local do localStorage. Assim o nome/nick/emoji
  // persistem entre reloads e dispositivos quando há sessão.
  const displayProfile = (auth.isLoggedIn && auth.profile)
    ? {
        name:   auth.profile.display_name || auth.profile.username,
        handle: `@${auth.profile.username}`,
        avatar: auth.profile.avatar_emoji || AVATAR_PADRAO,
      }
    : profile;
  const [showAuthModal,      setShowAuthModal]      = useState(false);
  const [authMotivo,         setAuthMotivo]         = useState(null);  // texto do porquê da conta (MOTIVOS_CONTA)
  const [mesclado,           setMesclado]           = useState(null);  // resumo da junção convidado → conta

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
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";
  // Persistido (não só lido no mount) pra fechar sozinho quando a sync
  // descobre que a conta já tem dados (lib/sync.js).
  const [onboarded,         setOnboarded]         = usePersistedState(SK.onboarded, false);
  const showOnboarding = !onboarded;
  const [showStreakDetail,  setShowStreakDetail]  = useState(false);
  const [streakBroken,     setStreakBroken]      = useState(null); // null | { oldCount, hasFreeze }
  const [riskDismissed,    setRiskDismissed]     = useState(false);
  const [snoozeDefault,    setSnoozeDefault]     = usePersistedState(SK.snoozeDefault, "1d");
  const [snoozeAsked,      setSnoozeAsked]       = usePersistedState(SK.snoozeAsked, false);
  const [showCreatePollModal,  setShowCreatePollModal]  = useState(false);
  const [showNotifSettings,    setShowNotifSettings]    = useState(false);


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
    setTimeout(() => showToast(`Conquista: ${q.nome} · +${q.xp} XP`, "bg-blue-600/90"), 900);
  }, [finance.lancamentos, finance.dividas, finance.metas, finance.revisoes, finance.recorrentes, streak, reservaMeses]); // eslint-disable-line react-hooks/exhaustive-deps


  // Streak risk: last active was yesterday, hour >= 18, hasn't decided today
  const streakAtRisk = (() => {
    if (!streak.lastActiveDate || streak.count === 0) return false;
    const today = todayKey();
    if (streak.lastActiveDate === today) return false;
    const gap = daysBetween(streak.lastActiveDate, today);
    return gap === 1 && new Date().getHours() >= 18;
  })();

  // Pede conta explicando o motivo no contexto (null = entrar, sem motivo).
  function pedirConta(motivo = null) { setAuthMotivo(motivo); setShowAuthModal(true); }

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
      setTimeout(() => notify("Notificações ativadas", "Você vai receber lembretes inteligentes.", "test-notif"), 200);
      return;
    }
    const result = await Notification.requestPermission();
    if (result === "granted") {
      setNotifSettings(s => ({ ...s, enabled: true, permission: "granted" }));
      setTimeout(() => notify("Notificações ativadas", "Você vai receber lembretes inteligentes.", "test-notif"), 200);
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
      if (gainFreeze) setTimeout(() => showToast("Você ganhou um escudo de sequência", "bg-blue-600/90"), 400);
      return { ...s, count, best: Math.max(s.best, count), lastActiveDate: today, freezesAvailable: gainFreeze ? Math.min(2, s.freezesAvailable + 1) : s.freezesAvailable };
    });
  }

  function handleUseFreeze() {
    setStreak((s) => ({ ...s, lastActiveDate: addDays(todayKey(), -1), freezesAvailable: Math.max(0, s.freezesAvailable - 1) }));
    setStreakBroken(null);
    showToast("Escudo usado. Sequência salva", "bg-amber-600/90");
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
  async function handleLogout() {
    if (!auth.isLoggedIn) { showToast("Não há sessão ativa.", "bg-white/10"); return; }
    if (!window.confirm(`Deseja sair do ${APP_NAME}? Seus dados saem deste aparelho e continuam salvos na sua conta.`)) return;
    // Sobe o que falta e limpa o aparelho antes de encerrar a sessão (depois
    // do signOut não dá mais pra gravar em user_data).
    if (!(await finishSync())) {
      if (!window.confirm("Não foi possível salvar suas últimas alterações na conta (sem conexão?). Sair mesmo assim? O que não foi salvo será perdido.")) return;
      await finishSync({ force: true });
    }
    await auth.signOut();
    showToast("Sessão encerrada.", "bg-white/10");
  }

  async function clearAllData() {
    // A confirmação fica no Perfil (ProfileTab).
    // Com conta: só o aparelho. Os setters abaixo gravariam vazio e a sync
    // mandaria pra conta; limparAparelho troca o local pelo que está na conta.
    if (auth.isLoggedIn) {
      if (await limparAparelho()) showToast("Dados deste aparelho limpos. Sua conta não mudou.", "bg-emerald-600/90");
      else showToast("Não deu pra falar com a sua conta agora. Nada foi apagado.", "bg-red-600/90");
      return;
    }
    [...Object.values(SK), NOTIF_LAST_PEAK, NOTIF_LAST_STREAK].forEach((key) => { try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch {} });
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
    showToast(`${data.tipo === "entrada" ? "Entrada" : "Saída"} de ${formatBRL(data.valor)} salva${extra}`, "bg-emerald-600/90");
    setActiveTab("home");
  }

  // Ao logar, vincula as enquetes criadas anonimamente à conta.
  useEffect(() => {
    if (auth.user?.id) migrateAnonPolls(auth.user.id).catch(() => {});
  }, [auth.user?.id]);

  // Logado: espelha os dados pessoais na conta (lib/sync.js) pra que apareçam
  // em qualquer navegador. Convidado: só neste aparelho (lib/storage.js); no
  // primeiro login os dados dele são juntados com os da conta.
  useEffect(() => {
    const f = (e) => setMesclado(e.detail);
    window.addEventListener(MESCLADO_EVENT, f);
    return () => window.removeEventListener(MESCLADO_EVENT, f);
  }, []);
  useEffect(() => {
    if (!auth.user?.id) return;
    startSync(auth.user.id);
    return () => stopSync();
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
    showToast(`Dívida quitada: ${l.descricao}`, "bg-emerald-600/90");
    if (!prefersReducedMotion) fireDeckCompleteConfetti();
  }

  // Pagamento feito fora do deck (Calendário) ou aporte em caixinha: conta
  // como atividade do dia pro streak.
  function handlePagoFora(l, r = {}) {
    registerActivity();
    if (l) handleDecision({ id: Date.now(), lancamentoId: l.id, title: l.descricao, valor: l.valor, categoria: l.categoria, direction: "right", label: l.tipo === "entrada" ? "Recebi" : "Paguei", decidedAt: new Date().toISOString() });
    if (r.quitouDivida) handleQuitouDivida(l);
  }

  const badges = { social: social.pendingIncoming.length };
  const keyboardEnabled = activeTab === "home" && !showOnboarding && !showAuthModal && !streakBroken;
  const abrirStreak = () => setShowStreakDetail(true);
  const entrarBtn = !auth.isLoggedIn && (
    <button type="button" onClick={() => pedirConta()} className={`${btnCls.secondary} h-9 px-3 text-[13px] ${bp === "tablet" ? "w-11 px-0" : bp === "desktop" ? "w-full" : ""}`} aria-label="Entrar" title="Entrar">
      {bp === "tablet" ? <LogIn size={18} strokeWidth={ICON_STROKE} aria-hidden /> : "Entrar"}
    </button>
  );

  // Aviso de sequência em risco (só na Início).
  const riskBanner = (
    <AnimatePresence>
      {activeTab === "home" && streakAtRisk && !riskDismissed && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <TriangleAlert size={18} strokeWidth={ICON_STROKE} className="text-warn flex-shrink-0" aria-hidden />
            <p className="text-[13px] text-fg flex-1 leading-snug">Sua sequência de <strong className="font-semibold">{streak.count} dias</strong> acaba à meia-noite. Registre ou revise 1 lançamento pra manter.</p>
            <button type="button" onClick={() => setRiskDismissed(true)} aria-label="Dispensar aviso" className="w-8 h-8 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition flex-shrink-0"><X size={16} strokeWidth={ICON_STROKE} aria-hidden /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Início: saldo → card → ações → atividade. No desktop, 2 colunas.
  const home = (
    <div className="h-full overflow-y-auto">
      <div className={`mx-auto w-full ${isDesktop ? "max-w-[1120px] px-10 py-8" : "max-w-[640px] px-4 sm:px-6 pt-4 pb-28 md:pb-10 md:pt-8"}`}>
        {riskBanner}
        {avisarConta && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <Smartphone size={18} strokeWidth={ICON_STROKE} className="text-fg-2 flex-shrink-0" aria-hidden />
            <p className="text-[13px] text-fg flex-1 leading-snug">Seus dados estão só neste aparelho. <button type="button" onClick={() => pedirConta(MOTIVOS_CONTA.guardar)} className="font-semibold text-brand-ink hover:underline">Crie uma conta pra não perder.</button></p>
            <button type="button" onClick={() => setAvisoContaDispensado(todayKey())} aria-label="Dispensar aviso" className="w-8 h-8 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition flex-shrink-0"><X size={16} strokeWidth={ICON_STROKE} aria-hidden /></button>
          </div>
        )}
        <div className={isDesktop ? "grid grid-cols-[minmax(0,1fr)_360px] gap-10 items-start" : ""}>
          <FinDeck
            isDesktop={isDesktop} finance={finance}
            snoozeDefault={snoozeDefault} setSnoozeDefault={setSnoozeDefault} snoozeAsked={snoozeAsked} setSnoozeAsked={setSnoozeAsked}
            keyboardEnabled={keyboardEnabled} onActivity={registerActivity} onDecision={handleDecision} onDividido={handleDividido} onQuitouDivida={handleQuitouDivida}
            onDeckComplete={() => { if (!prefersReducedMotion) fireDeckCompleteConfetti(); }} onNavigate={setActiveTab} showToast={showToast} stats={statsMes}
            headerActions={<>
              <button type="button" onClick={() => setActiveTab("create")} className={`${btnCls.primary} h-10 px-4 text-sm flex-1 sm:flex-none`}><Plus size={18} strokeWidth={ICON_STROKE} aria-hidden />Novo lançamento</button>
              <button type="button" onClick={() => setShowCreatePollModal(true)} title="Bora? — enquete de grupo" className={`${btnCls.secondary} h-10 px-4 text-sm`}><Vote size={18} strokeWidth={ICON_STROKE} aria-hidden />Bora?</button>
            </>}
          />
          <div className={`flex flex-col gap-6 ${isDesktop ? "" : "mt-10"}`}>
            {isDesktop && <DecisoesCard stats={statsMes} />}
            <RecentActivity finance={finance} onVerTudo={() => setActiveTab("activity")} />
          </div>
        </div>
      </div>
    </div>
  );

  const createForm = (
    <NovoLancamentoForm
      isDesktop={isDesktop}
      categorias={finance.categorias}
      contas={finance.contas}
      contaPadrao={finance.contaPadrao}
      onCancel={() => setActiveTab("home")}
      onSubmit={handleCriarLancamento}
      showToast={showToast}
    />
  );
  const profileTab = (
    <ProfileTab
      profile={displayProfile} stats={stats} streak={streak}
      notifSettings={notifSettings}
      openProfileEditor={openProfileEditor}
      setShowNotifSettings={setShowNotifSettings} setShowAboutModal={setShowAboutModal}
      handleLogout={handleLogout}
      clearAllData={clearAllData} isDesktop={isDesktop}
      isLoggedIn={auth.isLoggedIn} onCriarConta={() => pedirConta(MOTIVOS_CONTA.guardar)}
      snoozeDefault={snoozeDefault} onSnoozeDefaultChange={setSnoozeDefault}
      finance={finance} conquistas={conquistas} reservaMeses={reservaMeses} setReservaMeses={setReservaMeses} onNavigate={setActiveTab} showToast={showToast}
    />
  );
  const social_ = <SocialExplore isDesktop={isDesktop} isLoggedIn={auth.isLoggedIn} userId={auth.user?.id} social={social} splits={splits} cob={cob} finance={finance} nome={displayProfile.name} showToast={showToast} onCreatePoll={() => setShowCreatePollModal(true)} onRequireLogin={pedirConta} initialTab={socialTab} />;

  // ════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen w-full bg-page">
      <div className="flex w-full" style={{ height: "100dvh" }}>
        {bp !== "mobile" && (
          <Sidebar compact={bp === "tablet"} activeTab={activeTab} onTab={setActiveTab} badges={badges} streak={streak.count} onStreak={abrirStreak} footer={entrarBtn} />
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {bp === "mobile" && (
            <header className="flex-shrink-0 flex items-center justify-between gap-2 px-4 pb-2 bg-page" style={{ paddingTop: "max(env(safe-area-inset-top), 14px)" }}>
              <h1 className="min-w-0 text-[17px] max-[340px]:text-[15px] font-bold tracking-tight leading-tight text-fg"><Brand icon iconSize="1.5em" /></h1>
              <div className="flex items-center gap-1 shrink-0">
                <StreakFlame count={streak.count} onClick={abrirStreak} />
                {entrarBtn}
              </div>
            </header>
          )}

          <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {activeTab === "home" && home}
            {activeTab !== "home" && (isDesktop ? (
              <>
                {activeTab === "social" && social_}
                {activeTab === "activity" && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                      <ActivityTab finance={finance} showToast={showToast} onPago={handlePagoFora} />
                    </div>
                  </div>
                )}
                {activeTab === "create" && createForm}
                {activeTab === "profile" && (
                  <div className="flex flex-1 flex-col items-center overflow-y-auto">
                    <div className="w-full max-w-[900px]">{profileTab}</div>
                  </div>
                )}
              </>
            ) : (
              <div className={`flex-1 min-h-0 relative w-full ${bp === "tablet" ? "max-w-[640px] mx-auto" : "pb-[76px]"}`}>
                {activeTab === "social" && social_}
                {activeTab === "activity" && <ActivityTab finance={finance} showToast={showToast} onPago={handlePagoFora} />}
                {activeTab === "create" && createForm}
                {activeTab === "profile" && <div className="h-full overflow-y-auto">{profileTab}</div>}
              </div>
            ))}
          </main>
        </div>
      </div>

      {bp === "mobile" && <BottomNav activeTab={activeTab} onTab={setActiveTab} badges={badges} />}

      {showOnboarding && (
        <Onboarding
          onFinish={(comExemplo) => {
            setOnboarded(true);
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
          <Sheet key="auth-modal" title={authMotivo ? "Criar conta ou entrar" : `Entrar no ${APP_NAME}`} onClose={() => setShowAuthModal(false)}>
            <div className="-mx-5 -mb-5"><AuthScreen motivo={authMotivo} onSendLink={auth.sendMagicLink} onGoogle={auth.signInWithGoogle} /></div>
          </Sheet>
        )}
        {mesclado && (
          <Sheet key="mesclado" title="Seus dados vieram junto" onClose={() => setMesclado(null)}>
            <p className="text-sm text-fg">{resumoTexto(mesclado.trazidos) || "Juntamos os dados deste aparelho com os da sua conta."}</p>
            {mesclado.saldoMantido && <p className="mt-3 text-[13px] text-fg-2 flex items-start gap-1.5"><Wallet size={14} strokeWidth={ICON_STROKE} className="text-warn flex-shrink-0 mt-0.5" aria-hidden />{SALDO_MANTIDO_TEXTO}</p>}
            {mesclado.duplicados.length > 0 && (
              <div className="mt-4 rounded-md bg-tile px-4 py-3">
                <p className="text-[13px] font-semibold text-fg mb-1.5 flex items-center gap-1.5"><TriangleAlert size={14} strokeWidth={ICON_STROKE} className="text-warn" aria-hidden />Pode ter ficado repetido</p>
                <ul className="text-[13px] text-fg-2 space-y-0.5">{mesclado.duplicados.map((d, i) => <li key={i}>{duplicadoTexto(d)}</li>)}</ul>
                <p className="text-[12px] text-fg-3 mt-2 leading-relaxed">Estava na conta e neste aparelho. Confira em Atividade → Fixos e no Perfil → Contas e apague o que sobrar.</p>
              </div>
            )}
            <button type="button" onClick={() => setMesclado(null)} className={`${btnCls.primary} w-full py-3 text-sm mt-5`}>Beleza</button>
          </Sheet>
        )}
        {showProfileEditor && (
          <Sheet key="profile-editor" title="Editar perfil" kicker="Atualize nome, nick e avatar." onClose={closeProfileEditor} maxWidth="max-w-md" z="z-50">
            <div className="flex justify-center mb-4"><Avatar emoji={editedProfile.avatar} className="w-14 h-14 text-3xl" iconSize={26} /></div>
            <div className="space-y-3 mb-4">
              <input value={editedProfile.name} onChange={(e) => setEditedProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Seu nome" aria-label="Nome" className={inputCls} />
              <div>
                <input value={editedProfile.handle} onChange={(e) => setEditedProfile((p) => ({ ...p, handle: e.target.value }))} placeholder="@nick" aria-label="Nick" className={`${inputCls} ${
                  auth.isLoggedIn && editorUsernameStatus === "available" ? "!border-pos"
                  : auth.isLoggedIn && (editorUsernameStatus === "taken" || editorUsernameStatus === "invalid") ? "!border-neg"
                  : ""
                }`} />
                {auth.isLoggedIn && <div className="mt-1.5"><UsernameHint status={editorUsernameStatus} value={editedProfile.handle} /></div>}
              </div>
            </div>
            <div className="grid grid-cols-8 gap-1.5 mb-4">{AVATAR_EMOJIS.map((emoji) => (<button key={emoji} type="button" aria-pressed={editedProfile.avatar === emoji} onClick={() => setEditedProfile((p) => ({ ...p, avatar: emoji }))} className={`rounded-md aspect-square text-lg transition border ${editedProfile.avatar === emoji ? "border-brand bg-brand/[0.06]" : "border-transparent hover:bg-tile"}`}>{emoji}</button>))}</div>
            {profileEditError && <p className="text-[13px] text-neg px-1 mb-3">{profileEditError}</p>}
            <div className="flex gap-2"><button type="button" onClick={closeProfileEditor} className={`${btnCls.secondary} flex-1 py-2.5 text-sm`}>Cancelar</button><button type="button" onClick={saveProfileEdits} disabled={savingProfile || (auth.isLoggedIn && editorUsernameStatus !== "available")} className={`${btnCls.primary} flex-1 py-2.5 text-sm`}>{savingProfile ? <span className="w-4 h-4 rounded-full border-2 border-on-brand/30 border-t-on-brand animate-spin" /> : "Salvar"}</button></div>
          </Sheet>
        )}
        {showAboutModal && (
          <Sheet key="about" title={`Sobre o ${APP_NAME}`} kicker="Versão 0.0.0" onClose={() => setShowAboutModal(false)} z="z-50">
            <p className="text-sm text-fg-2 leading-relaxed mb-5">Organização financeira pessoal no ritmo do swipe: pague, adie ou divida cada conta em um gesto. Sem conta, os dados ficam só neste aparelho; com conta, ficam salvos nela e aparecem em qualquer aparelho.</p>
            <button type="button" onClick={() => setShowAboutModal(false)} className={`${btnCls.secondary} w-full py-2.5 text-sm`}>Fechar</button>
          </Sheet>
        )}
        {showNotifSettings && (
          <Sheet key="notifs" title="Notificações" onClose={() => setShowNotifSettings(false)} z="z-50">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border border-line px-4 py-3.5">
                <span className="w-9 h-9 rounded-md bg-tile text-fg flex items-center justify-center flex-shrink-0" aria-hidden><Bell size={18} strokeWidth={ICON_STROKE} /></span>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-fg">Ativar notificações</p><p className="text-[12px] text-fg-2 mt-0.5">Permissão no browser necessária</p></div>
                <IOSToggle value={notifSettings.enabled} onChange={handleEnableNotifs} disabled={!("Notification" in window)} />
              </div>
              {(notifSettings.permission === "denied" || ("Notification" in window && Notification.permission === "denied")) && (
                <div className="rounded-md border border-neg/30 px-4 py-3">
                  <p className="text-[13px] text-neg font-medium mb-0.5">Permissão bloqueada</p>
                  <p className="text-[12px] text-fg-2">Acesse as configurações do browser e permita notificações para este site manualmente.</p>
                </div>
              )}
              <div className="rounded-md border border-line divide-y divide-line">
                {[
                  { key: "peakReminder", Icon: Zap,   label: "Lembrete no meu horário",       sub: "No horário em que você costuma revisar as contas" },
                  { key: "streakAlert",  Icon: Flame, label: "Aviso de sequência em risco",   sub: "Após 19h se você ainda não registrou nada hoje" },
                ].map(({ key, Icon, label, sub }) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-3.5">
                    <Icon size={18} strokeWidth={ICON_STROKE} className="text-fg-2 flex-shrink-0" aria-hidden />
                    <div className="flex-1 min-w-0"><p className={`text-[13px] font-medium ${notifSettings.enabled ? "text-fg" : "text-fg-3"}`}>{label}</p><p className="text-[12px] text-fg-2 mt-0.5">{sub}</p></div>
                    <IOSToggle value={notifSettings[key]} onChange={v => setNotifSettings(s => ({ ...s, [key]: v }))} disabled={!notifSettings.enabled} />
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-fg-3 text-center leading-relaxed px-2">Funciona com o app aberto. Para notificações em segundo plano, seria necessário integrar Push API + service worker.</p>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      <Toast visible={toast.visible} message={toast.message} color={toast.color} />
    </div>
  );
}