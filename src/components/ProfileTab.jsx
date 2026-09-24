import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ProfileTab({
  profile, stats, streak, notifSettings,
  openProfileEditor, setShowNotifSettings, setShowAboutModal,
  handleLogout, clearAllData, isDesktop = false,
  snoozeDefault, onSnoozeDefaultChange,
}) {
  const [showDanger, setShowDanger] = useState(false);

  const totalDecisions = stats.accepted + stats.rejected + stats.shared;
  const totalXP        = totalDecisions * 10;
  const level          = Math.floor(totalXP / 1000) + 1;
  const xpInLevel      = totalXP % 1000;
  const xpProgress     = (xpInLevel / 1000) * 100;

  const IconBell = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
  const IconInfo = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
  const IconChevron = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/20 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;

  // ── Section builders (px removed when desktop — parent provides it) ──

  const statsSection = (
    <div className={`${isDesktop ? "" : "px-5"} grid grid-cols-3 gap-2 mb-5`}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-[#1d4ed8]/10 border border-[#1d4ed8]/20 p-3.5 flex flex-col gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.8} className={isDesktop ? "w-[18px] h-[18px] flex-shrink-0" : "w-4.5 h-4.5"}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div className={`${isDesktop ? "text-[32px]" : "text-[22px]"} font-bold text-[#3b82f6] leading-none`}>{totalDecisions}</div>
        <div className="text-[10px] text-white/30 font-medium">Decididas</div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex flex-col gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.8} className={isDesktop ? "w-[18px] h-[18px] flex-shrink-0" : "w-4.5 h-4.5"}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>
        <div className={`${isDesktop ? "text-[32px]" : "text-[22px]"} font-bold text-amber-400 leading-none`}>{streak.count}</div>
        <div className="text-[10px] text-white/30 font-medium">Dias seguidos</div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 flex flex-col gap-1.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.8} className={isDesktop ? "w-[18px] h-[18px] flex-shrink-0" : "w-4.5 h-4.5"}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
        <div className={`${isDesktop ? "text-[32px]" : "text-[22px]"} font-bold text-emerald-400 leading-none`}>
          {totalDecisions > 0 ? `${Math.round((stats.accepted / totalDecisions) * 100)}%` : "—"}
        </div>
        <div className="text-[10px] text-white/30 font-medium">Aceite</div>
      </motion.div>
    </div>
  );

  const settingsSection = (
    <div className={isDesktop ? "" : "px-5"}>
      <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/25 mb-3">Configurações</h3>
      <div className="flex flex-col">
        {/* Snooze default setting */}
        <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border-b border-white/[0.04]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-500/20">
            <span className="text-base">⏰</span>
          </div>
          <span className="flex-1 text-[13px] text-white/70">Tempo de adiamento</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onSnoozeDefaultChange?.("1h")}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${snoozeDefault === "1h" ? "bg-amber-500/25 border-amber-400/50 text-amber-200" : "bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60"}`}
            >1 hora</button>
            <button
              type="button"
              onClick={() => onSnoozeDefaultChange?.("1d")}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${snoozeDefault === "1d" ? "bg-blue-500/25 border-blue-400/50 text-blue-200" : "bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60"}`}
            >1 dia</button>
          </div>
        </div>
        {[
          { label: "Notificações", icon: IconBell, action: () => setShowNotifSettings(true), badge: notifSettings.enabled ? "On" : null, color: "#10b981" },
          { label: "Sobre",        icon: IconInfo, action: () => setShowAboutModal(true), badge: null, color: "#3b82f6" },
        ].map(({ label, icon, action, badge, color }, i) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className={`flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/[0.04] transition rounded-xl ${i > 0 ? "border-t border-white/[0.04]" : ""}`}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
              <div style={{ color }}>{icon}</div>
            </div>
            <span className="flex-1 text-[13px] text-white/70">{label}</span>
            {badge && <span className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mr-1">{badge}</span>}
            {IconChevron}
          </button>
        ))}
      </div>

      <div className="border-t border-white/[0.05] mt-1 pt-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-red-500/[0.06] transition rounded-xl w-full"
        >
          <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={1.8} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
          </div>
          <span className="flex-1 text-[13px] text-red-400/75">Sair</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2} className="w-4 h-4 opacity-30 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowDanger(v => !v)}
          className="flex items-center gap-1.5 text-[11px] text-white/15 hover:text-white/30 transition pl-4"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          Zona perigosa
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3 h-3 transition-transform ${showDanger ? "rotate-90" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
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
              <button
                type="button"
                onClick={clearAllData}
                className="mt-2 flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/10 transition rounded-xl w-full border border-amber-500/15"
              >
                <span className="text-[15px]">🗑️</span>
                <span className="text-[12px] text-amber-400/70">Limpar todos os dados locais</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-full pb-8">

      {/* ── Capa + Avatar ─────────────────────────────────────── */}
      <div className="relative mb-14">
        <div className="h-24 relative overflow-hidden bg-gradient-to-br from-[#1d4ed8] via-[#7c3aed] to-[#0891b2]">
          <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        </div>
        <button
          type="button"
          onClick={openProfileEditor}
          className="absolute left-5 -bottom-10 group"
        >
          <div className="w-[84px] h-[84px] rounded-3xl bg-gradient-to-br from-[#1d4ed8] to-[#7c3aed] border-[3px] border-[#0d0d0f] flex items-center justify-center text-[42px] shadow-2xl group-hover:brightness-110 transition select-none">
            {profile.avatar}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#2563eb] border-2 border-[#0d0d0f] flex items-center justify-center text-[10px] shadow">✏️</div>
        </button>
        <button
          type="button"
          onClick={openProfileEditor}
          className="absolute right-5 bottom-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/30 border border-white/20 text-[12px] font-medium text-white/80 hover:bg-black/50 hover:text-white transition backdrop-blur-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
          Editar perfil
        </button>
      </div>

      {/* ── Identidade ────────────────────────────────────────── */}
      <div className="px-5 mb-5">
        <div className="flex items-baseline gap-2.5 flex-wrap mb-0.5">
          <h2 className="text-[20px] font-[500] text-white leading-tight">{profile.name}</h2>
          {streak.count > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              🔥 {streak.count} {streak.count === 1 ? "dia" : "dias"}
            </span>
          )}
        </div>
        <p className="text-[13px] text-white/35">
          {profile.handle} · Nível {level}
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/20">Nível {level}</span>
            <span className="text-[10px] text-white/20">{xpInLevel} / 1000 XP</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-[#1d4ed8] to-[#7c3aed]"
            />
          </div>
          {streak.best > 0 && streak.best > streak.count && (
            <p className="text-[11px] text-white/20 mt-1.5">Recorde: 🔥 {streak.best} dias</p>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className={isDesktop ? "px-5 pb-4 max-w-xl" : ""}>
        {statsSection}
        {settingsSection}
      </div>
    </motion.div>
  );
}
