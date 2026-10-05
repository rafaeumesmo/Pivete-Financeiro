import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContasSection, ReservaSection, ConquistasSection, CategoriasSection } from "./ProfileFinance.jsx";
import { formatBRL } from "../lib/money.js";
import { todayKey } from "../lib/dates.js";
import { rendaMensal } from "../lib/finance.js";
import { xpTotal, nivel, taxaEmDia, custoMensal, reservaAtual } from "../lib/conquistas.js";
import { useTema } from "../lib/theme.js";
import { useOcultarValores } from "../lib/privacy.js";
import { EyeButton, btnCls } from "./ui.jsx";
import { StreakIcon } from "./StreakWidgets.jsx";
import { Avatar } from "./Avatar.jsx";
import { Sheet } from "./Sheet.jsx";
import { ICON_STROKE } from "../lib/icons.js";
import { Globe, Lock, Wallet, Timer, Info, Sun, Moon, AlarmClock, Bell, LogOut, TriangleAlert, ChevronRight, Trash2, Pencil, CloudUpload } from "lucide-react";

// Cabeçalho dos blocos Público / Privado do perfil.
function BlockHeader({ Icon, title, sub, action, isDesktop }) {
  return (
    <div className={`${isDesktop ? "" : "px-5"} flex items-start gap-3 mb-4`}>
      <span className="w-8 h-8 rounded-md bg-tile text-fg flex items-center justify-center flex-shrink-0" aria-hidden><Icon size={16} strokeWidth={ICON_STROKE} /></span>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-semibold text-fg leading-tight">{title}</h3>
        <p className="text-[13px] text-fg-2 leading-snug mt-0.5">{sub}</p>
      </div>
      {action}
    </div>
  );
}

// Segmented control pequeno (tema, adiamento).
function Segmented({ value, onChange, options, label }) {
  return (
    <div className="inline-flex p-0.5 rounded-md bg-tile" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={`text-[12px] lg:text-[13px] font-medium px-2.5 py-1 rounded-sm transition ${value === o.id ? "bg-surface text-fg shadow" : "text-fg-2 hover:text-fg"}`}>{o.label}</button>
      ))}
    </div>
  );
}

function Linha({ Icon, children, tone = "text-fg", onClick, right }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${onClick ? "hover:bg-tile transition" : ""}`}>
      <span className={`w-8 h-8 rounded-md bg-tile flex items-center justify-center flex-shrink-0 ${tone}`} aria-hidden><Icon size={16} strokeWidth={ICON_STROKE} /></span>
      <span className={`flex-1 text-[14px] ${tone}`}>{children}</span>
      {right}
    </Tag>
  );
}

export function ProfileTab({
  profile, stats, streak, notifSettings,
  openProfileEditor, setShowNotifSettings, setShowAboutModal,
  handleLogout, clearAllData, isDesktop = false, isLoggedIn = false, onCriarConta,
  snoozeDefault, onSnoozeDefaultChange,
  finance, conquistas, reservaMeses, setReservaMeses, onNavigate, showToast,
}) {
  const [tema, setTema] = useTema();
  const [showDanger, setShowDanger] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [ocultar] = useOcultarValores();

  const totalDecisions = stats.accepted + stats.rejected + stats.shared;
  const { nivel: level, noNivel: xpInLevel, porNivel } = nivel(xpTotal(totalDecisions, conquistas));
  const xpProgress     = (xpInLevel / porNivel) * 100;
  const hoje           = todayKey();
  const renda          = rendaMensal(finance.recorrentes);
  const emDia          = taxaEmDia(finance.lancamentos);
  const custo          = custoMensal(finance, hoje);
  const reserva        = reservaAtual(finance.metas);

  const chevron = <ChevronRight size={16} strokeWidth={ICON_STROKE} className="text-fg-3 flex-shrink-0" aria-hidden />;

  // ── Section builders (px removed when desktop — parent provides it) ──

  // ── Público x privado ──
  // Público: identidade, nível, sequência e conquistas — nenhum valor em R$.
  // Privado: tudo que é dinheiro. Fica em user_data (RLS: só o dono lê) e nunca
  // entra em profiles, que é o que a aba Social enxerga. O olho só mascara a tela.


  const PUBLICO_SUB = "Seus amigos veem nível, sequência e conquistas — nada de valores em R$.";
  const PRIVADO_SUB = "Só você vê — renda, saldos e reserva nunca vão pro seu perfil na aba Social.";

  const publicSection = (
    <div className="mb-8">
      <BlockHeader isDesktop={isDesktop} Icon={Globe} title="Público" sub={PUBLICO_SUB} />
      <div className={isDesktop ? "" : "px-5"}>
        <ConquistasSection desbloqueadas={conquistas} />
      </div>
    </div>
  );

  const statsSection = (
    <div className={`${isDesktop ? "" : "px-5"} grid grid-cols-2 gap-2 mb-6`}>
      <button type="button" onClick={() => onNavigate("activity")} className="text-left rounded-lg bg-surface border border-line p-4 flex flex-col gap-2 min-w-0 hover:bg-tile transition">
        <span className="w-8 h-8 rounded-md bg-tile text-fg flex items-center justify-center" aria-hidden><Wallet size={16} strokeWidth={ICON_STROKE} /></span>
        <div className={`${isDesktop ? "text-[22px]" : "text-[17px]"} font-semibold text-fg leading-none tabular-nums truncate`}>{formatBRL(renda, { compact: true, oculto: ocultar })}</div>
        <div className="text-[13px] text-fg-2">Renda mensal</div>
      </button>
      <div className="rounded-lg bg-surface border border-line p-4 flex flex-col gap-2">
        <span className="w-8 h-8 rounded-md bg-tile text-fg flex items-center justify-center" aria-hidden><Timer size={16} strokeWidth={ICON_STROKE} /></span>
        <div className={`${isDesktop ? "text-[22px]" : "text-[17px]"} font-semibold text-fg leading-none tabular-nums`}>{emDia ? `${Math.round(emDia.pct * 100)}%` : "—"}</div>
        <div className="text-[13px] text-fg-2">Pagas em dia{emDia ? ` (${emDia.emDia}/${emDia.total})` : ""}</div>
      </div>
    </div>
  );

  const financeSections = (
    <div className={`${isDesktop ? "" : "px-5"} flex flex-col gap-6 mb-8`}>
      {finance.temExemplo && (
        <div className="rounded-lg border border-line bg-surface px-4 py-3 flex items-center gap-3">
          <Info size={18} strokeWidth={ICON_STROKE} className="text-brand-ink flex-shrink-0" aria-hidden />
          <p className="flex-1 text-[13px] text-fg leading-snug">Você está vendo <strong className="font-semibold">dados de exemplo</strong> (renda e fixos fictícios).</p>
          <button type="button" onClick={() => {
            if (!window.confirm("Apagar os dados de exemplo? Somem a renda e os fixos de exemplo e os lançamentos gerados por eles (o que foi pago volta pro saldo). O que você cadastrou continua.")) return;
            finance.limparExemplo();
            showToast("Dados de exemplo removidos", "bg-tile");
          }} className={`${btnCls.secondary} flex-shrink-0 px-3 py-1.5 text-[13px]`}>Limpar exemplo</button>
        </div>
      )}
      <ContasSection finance={finance} showToast={showToast} ocultar={ocultar} />
      <ReservaSection custo={custo} reserva={reserva} reservaMeses={reservaMeses} setReservaMeses={setReservaMeses}
        temCaixinhaReserva={finance.metas.some(m => /reserva/i.test(m.nome))}
        ocultar={ocultar}
        onCriarCaixinha={(alvo) => { finance.salvarMeta({ nome: "Reserva de emergência", alvo }); showToast("Caixinha de reserva criada", "bg-emerald-600/90"); }} />
      <CategoriasSection finance={finance} showToast={showToast} />
    </div>
  );

  const settingsSection = (
    <div className={isDesktop ? "" : "px-5"}>
      <h3 className="text-[15px] font-semibold text-fg mb-3">Configurações</h3>
      <div className="rounded-lg border border-line bg-surface divide-y divide-line overflow-hidden">
        {/* Tema — salvo na conta quando logado (SK.tema em SYNC_KEYS) */}
        <Linha Icon={tema === "claro" ? Sun : Moon} right={<Segmented label="Tema" value={tema} onChange={setTema} options={[{ id: "claro", label: "Claro" }, { id: "escuro", label: "Escuro" }]} />}>Tema</Linha>
        <Linha Icon={AlarmClock} right={<Segmented label="Tempo de adiamento" value={snoozeDefault} onChange={v => onSnoozeDefaultChange?.(v)} options={[{ id: "1h", label: "1 hora" }, { id: "1d", label: "1 dia" }]} />}>Tempo de adiamento</Linha>
        <Linha Icon={Bell} onClick={() => setShowNotifSettings(true)} right={<>{notifSettings.enabled && <span className="text-[13px] text-fg-2 mr-1">Ativas</span>}{chevron}</>}>Notificações</Linha>
        <Linha Icon={Info} onClick={() => setShowAboutModal(true)} right={chevron}>Sobre</Linha>
        {isLoggedIn
          ? <Linha Icon={LogOut} tone="text-neg" onClick={handleLogout}>Sair</Linha>
          : <>
              <Linha Icon={CloudUpload} onClick={onCriarConta} right={chevron}>Criar conta e guardar os dados</Linha>
              <Linha Icon={Trash2} tone="text-neg" onClick={() => setConfirmarApagar(true)}>Apagar dados deste aparelho</Linha>
            </>}
      </div>

      {isLoggedIn && <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowDanger(v => !v)}
          aria-expanded={showDanger}
          className="flex items-center gap-1.5 text-[13px] text-fg-2 hover:text-fg transition"
        >
          <TriangleAlert size={14} strokeWidth={ICON_STROKE} aria-hidden />
          Zona perigosa
          <ChevronRight size={14} strokeWidth={ICON_STROKE} className={`transition-transform ${showDanger ? "rotate-90" : ""}`} aria-hidden />
        </button>
        <AnimatePresence>
          {showDanger && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <button type="button" onClick={() => setConfirmarApagar(true)} className={`${btnCls.secondary} mt-2 w-full justify-start px-4 py-3 text-[13px] !text-neg`}>
                <Trash2 size={16} strokeWidth={ICON_STROKE} aria-hidden />
                Limpar os dados deste aparelho
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>}
    </div>
  );

  const confirmacao = (
    <AnimatePresence>
      {confirmarApagar && (
        <Sheet key="apagar" title={isLoggedIn ? "Limpar os dados deste aparelho?" : "Apagar dados deste aparelho?"} onClose={() => setConfirmarApagar(false)}>
          <p className="text-sm text-fg-2 leading-relaxed">
            {isLoggedIn
              ? "Só este aparelho é limpo: sua conta não muda e os dados dela são baixados de novo aqui. O que ainda não tinha subido é enviado antes. Pra tirar tudo deste aparelho, use Sair."
              : "Lançamentos, contas, fixos, caixinhas, cobranças e histórico somem deste aparelho. Sem conta, não tem como recuperar depois."}
          </p>
          <div className="flex gap-2 mt-5">
            <button type="button" onClick={() => setConfirmarApagar(false)} className={`${btnCls.secondary} flex-1 py-3 text-sm`}>Cancelar</button>
            <button type="button" onClick={() => { setConfirmarApagar(false); clearAllData(); }} className={`${btnCls.secondary} flex-1 py-3 text-sm !text-neg`}>Apagar</button>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  );

  const identidade = (
      <div className={isDesktop ? "" : "px-5 pt-6 mb-8"}>
        <div className="flex items-center gap-4">
          <button type="button" onClick={openProfileEditor} aria-label="Editar perfil" className="rounded-full flex-shrink-0 hover:opacity-80 transition">
            <Avatar emoji={profile.avatar} className="w-16 h-16 text-[32px]" iconSize={28} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-semibold text-fg leading-tight truncate">{profile.name}</h2>
            <p className="text-[13px] text-fg-2 truncate">{profile.handle} · Nível {level}</p>
          </div>
          <button type="button" onClick={openProfileEditor} className={`${btnCls.secondary} h-9 px-3 text-[13px] flex-shrink-0`}>
            <Pencil size={14} strokeWidth={ICON_STROKE} aria-hidden />Editar
          </button>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-medium text-fg">Nível {level}</span>
            <span className="text-[13px] text-fg-2 tabular-nums">{xpInLevel} / {porNivel} XP</span>
          </div>
          <div className="h-1.5 bg-tile rounded-sm overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-sm bg-brand"
            />
          </div>
          <p className="text-[13px] text-fg-2 mt-2 flex items-center gap-1.5">
            <StreakIcon count={streak.count} size={15} />
            Sequência de {streak.count} {streak.count === 1 ? "dia" : "dias"}
            {streak.best > streak.count && <span className="text-fg-3">· recorde {streak.best}</span>}
          </p>
        </div>
      </div>
  );

  // Desktop: perfil, privacidade e configurações numa coluna fixa à esquerda;
  // conquistas e o lado privado (dinheiro) ocupam o resto.
  if (isDesktop) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-[340px_minmax(0,1fr)] gap-10 items-start">
        <aside className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto flex flex-col gap-6 pb-1">
          {identidade}
          <div className="rounded-lg border border-line bg-surface p-4 flex items-start gap-3">
            <span className="w-8 h-8 rounded-md bg-tile text-fg flex items-center justify-center flex-shrink-0" aria-hidden><Globe size={16} strokeWidth={ICON_STROKE} /></span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-fg leading-tight">Público</h3>
              <p className="text-[14px] text-fg-2 leading-snug mt-0.5">{PUBLICO_SUB}</p>
            </div>
          </div>
          {settingsSection}
        </aside>
        <div className="min-w-0 pb-8">
          <div className="mb-10"><ConquistasSection desbloqueadas={conquistas} /></div>
          <BlockHeader isDesktop Icon={Lock} title="Privado" sub={PRIVADO_SUB} action={<EyeButton />} />
          {statsSection}
          {financeSections}
        </div>
        {confirmacao}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-full pb-8">
      {identidade}
      {publicSection}
      <BlockHeader Icon={Lock} title="Privado" sub={PRIVADO_SUB} action={<EyeButton />} />
      {statsSection}
      {financeSections}
      {settingsSection}
      {confirmacao}
    </motion.div>
  );
}
