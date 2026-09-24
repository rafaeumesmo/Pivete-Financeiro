import { useState } from "react";
import { motion } from "framer-motion";
import { todayKey, daysBetween, formatSnoozeReturn } from "../lib/dates.js";
import {
  getStreak, getAdherence, isScheduledOnDate, toDateStr, recurrenceLabel,
  getWeekStrip, DAY_SHORT,
} from "../lib/commitments.js";
import { ActivityCalendar } from "./ActivityCalendar.jsx";
import { ListsPanel } from "./ListsPanel.jsx";

// ── WeekStrip ─────────────────────────────────────────────────
const STATUS_CFG = {
  done:    { bg: "bg-emerald-500",     icon: "✓" },
  missed:  { bg: "bg-red-500/70",      icon: "✗" },
  rest:    { bg: "bg-white/[0.08]",    icon: "" },
  pending: { bg: "bg-[#2563eb]",       icon: "" },
  future:  { bg: "bg-white/[0.04]",   icon: "" },
};

function WeekStrip({ commitment, log, compact = false }) {
  const strip = getWeekStrip(commitment, log);
  if (compact) {
    return (
      <div className="flex gap-0.5">
        {strip.map(({ dow, isToday, status }) => {
          const cfg = STATUS_CFG[status] || STATUS_CFG.future;
          return (
            <div
              key={dow}
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold text-white ${cfg.bg} ${isToday ? "ring-1 ring-white/40" : ""}`}
            >
              {cfg.icon || (status === "pending" ? DAY_SHORT[dow] : DAY_SHORT[dow])}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex gap-1">
      {strip.map(({ dow, isToday, status }) => {
        const cfg = STATUS_CFG[status] || STATUS_CFG.future;
        return (
          <div key={dow} className="flex flex-col items-center gap-0.5 flex-1">
            <span className={`text-[8px] font-semibold ${isToday ? "text-white" : "text-white/30"}`}>{DAY_SHORT[dow]}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${cfg.bg} ${isToday ? "ring-2 ring-white/25" : ""}`}>
              {cfg.icon}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ActivityTab ───────────────────────────────────────────────
export function ActivityTab({
  decisions, stats, streak, tasks = [], onNavigate, onWakeTask, onSnoozeMore,
  commitments = [], commitmentLog = [], onLogCommitment, onScheduleTask,
  onCreateCommitment, onEditCommitment, onTogglePauseCommitment, onDeleteCommitment,
  onToggleItem, onAddItem, onCompleteChecklist, onCreateChecklist,
}) {
  const [subTab, setSubTab] = useState("calendario");

  const snoozedTasks = tasks.filter(t => t.snoozeUntil && new Date(t.snoozeUntil) > new Date());
  const lists = tasks.filter(t => Array.isArray(t.items));
  const pendingListsCount = lists.filter(t => t.items.length === 0 || t.items.some(i => !i.done)).length;

  const today = todayKey();
  const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const GROUP_ORDER = ["Hoje", "Ontem", "Esta semana", "Este mês"];
  const grouped = {};

  for (const d of [...decisions].reverse()) {
    const dateStr = d.decidedAt?.slice(0, 10) || "";
    let group;
    if (dateStr === today) group = "Hoje";
    else if (dateStr === yesterdayStr) group = "Ontem";
    else {
      const diff = daysBetween(dateStr, today);
      group = diff < 7 ? "Esta semana" : "Este mês";
    }
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(d);
  }

  // Aceita rótulos antigos ("Aceito"/"Depois") pra decisões já salvas no
  // localStorage antes da troca de nomenclatura pra "Feito"/"Fazer".
  const badgeCfg = (label) => {
    if (label === "Aceito" || label === "Feito") return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: "✓" };
    if (label === "Depois" || label === "Fazer") return { cls: "bg-red-500/15 text-red-400 border-red-500/20",           icon: "⏰" };
    return                                              { cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",         icon: "🤝" };
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  const totalDecisions = stats.accepted + stats.rejected + stats.shared;

  const tabs = [
    { id: "calendario",   label: "Calendário" },
    { id: "listas",       label: "Listas",       badge: pendingListsCount },
    { id: "status",       label: "Status",       badge: snoozedTasks.length },
    { id: "compromissos", label: "Compromissos", badge: commitments.length },
    { id: "historico",    label: "Histórico" },
  ];

  return (
    <motion.div className="h-full overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Seu histórico</p>
        <h2 className="font-bold text-white text-lg">Atividade</h2>
      </div>

      {/* Sub-abas */}
      <div className="px-5 pt-4">
        <div className="flex gap-1 bg-white/[0.05] border border-white/[0.07] p-1 rounded-xl overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`relative flex-shrink-0 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition whitespace-nowrap ${
                subTab === tab.id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-[3px]">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendário ────────────────────────────────────────── */}
      {subTab === "calendario" && (
        <div className="pb-24">
          <ActivityCalendar tasks={tasks} commitments={commitments} onScheduleTask={onScheduleTask} onLogCommitment={onLogCommitment} />
        </div>
      )}

      {/* ── Listas ────────────────────────────────────────────── */}
      {subTab === "listas" && (
        <div className="pb-24">
          <ListsPanel tasks={tasks} onToggleItem={onToggleItem} onAddItem={onAddItem} onCompleteChecklist={onCompleteChecklist} onCreateChecklist={onCreateChecklist} />
        </div>
      )}

      {/* ── Status ────────────────────────────────────────────── */}
      {subTab === "status" && (
        <div className="pb-24">
          <div className="px-5 pt-4 pb-2 grid grid-cols-3 gap-2">
            {[
              { label: "Feitas",    value: stats.accepted, cls: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" },
              { label: "Fazer",     value: stats.rejected, cls: "bg-red-500/10 border border-red-500/20 text-red-400" },
              { label: "Delegadas", value: stats.shared,   cls: "bg-blue-500/10 border border-blue-500/20 text-blue-400" },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`rounded-2xl p-3 text-center ${cls}`}>
                <div className="text-xl font-bold leading-none">{value}</div>
                <div className="text-[10px] text-white/30 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {streak.count > 0 && (
            <div className="mx-5 mt-3 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
              <span className="text-xl">🔥</span>
              <div>
                <p className="text-[13px] font-semibold text-amber-300">{streak.count} {streak.count === 1 ? "dia" : "dias"} seguidos</p>
                {streak.best > streak.count && <p className="text-[10px] text-white/25 mt-0.5">Recorde: {streak.best} dias</p>}
              </div>
            </div>
          )}

          {/* Tarefas dormindo (snoozed) */}
          <div className="px-5 pt-4">
            <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-amber-400/70 mb-3 pl-1">
              Adiadas ({snoozedTasks.length})
            </h3>
            {snoozedTasks.length === 0 ? (
              <p className="text-[12px] text-white/20 py-2">Nenhuma tarefa adiada no momento.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {snoozedTasks.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl px-3 py-2.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-base flex-shrink-0">
                      {t.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white/85 truncate font-medium leading-snug">{t.title}</p>
                      <p className="text-[10px] text-amber-300/60 mt-0.5">⏰ Volta {formatSnoozeReturn(t.snoozeUntil)}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {onWakeTask && (
                        <button
                          onClick={() => onWakeTask(t.id)}
                          className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-1 rounded-lg hover:bg-emerald-500/25 transition"
                        >
                          Trazer agora
                        </button>
                      )}
                      {onSnoozeMore && (
                        <button
                          onClick={() => onSnoozeMore(t.id)}
                          className="text-[10px] font-medium text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-1 rounded-lg hover:bg-amber-500/25 transition"
                        >
                          +Adiar
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Compromissos recorrentes ──────────────────────────── */}
      {subTab === "compromissos" && (
        <div className="px-5 pt-4 pb-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-blue-400/70">
              Compromissos ({commitments.length})
            </h3>
            <button
              onClick={onCreateCommitment}
              className="text-[11px] font-semibold text-[#2563eb] hover:text-blue-400 transition flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Novo
            </button>
          </div>
          {commitments.length === 0 ? (
            <button
              onClick={onCreateCommitment}
              className="w-full rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-5 text-center hover:border-[#2563eb]/40 hover:bg-[#2563eb]/[0.04] transition group"
            >
              <div className="text-3xl mb-2 opacity-40 group-hover:opacity-70 transition">📅</div>
              <p className="text-[13px] text-white/30 group-hover:text-white/50 transition">Nenhum compromisso ainda.</p>
              <p className="text-[11px] text-[#2563eb]/50 mt-1">Toque para criar o primeiro</p>
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {commitments.map(c => {
                const streak  = getStreak(c, commitmentLog);
                const adh     = getAdherence(c, commitmentLog, 30);
                const today   = new Date();
                const dueToday = isScheduledOnDate(c, today) && !commitmentLog.find(e => e.commitmentId === c.id && e.date === toDateStr(today));
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border p-3.5 ${c.paused ? "border-white/[0.06] bg-white/[0.02] opacity-60" : "border-white/[0.08] bg-white/[0.03]"}`}
                  >
                    {/* Row 1: emoji + info + badge */}
                    <div className="flex items-start gap-2.5 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${c.gradient}`}>
                        {c.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[13px] text-white/90 font-semibold truncate leading-snug">{c.title}</p>
                          {c.paused && <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full flex-shrink-0">pausado</span>}
                          {dueToday && !c.paused && <span className="text-[9px] font-semibold text-blue-400 bg-[#2563eb]/15 border border-[#2563eb]/25 px-1.5 py-0.5 rounded-full flex-shrink-0">hoje</span>}
                        </div>
                        <p className="text-[10px] text-white/30">{recurrenceLabel(c)}{c.time ? ` · ${c.time}` : ""}</p>
                      </div>
                      {streak > 0 && (
                        <div className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          🔥 {streak}
                        </div>
                      )}
                    </div>

                    {/* Week strip */}
                    <WeekStrip commitment={c} log={commitmentLog} />

                    {/* Stats row */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        {adh && (
                          <span className="text-[10px] text-white/30">
                            {adh.pct}% em 30 dias
                          </span>
                        )}
                        {dueToday && !c.paused && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onLogCommitment?.(c.id, "done")}
                              className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-lg hover:bg-emerald-500/25 transition"
                            >✓ Feito</button>
                            <button
                              onClick={() => onLogCommitment?.(c.id, "missed")}
                              className="text-[10px] font-semibold text-red-400 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-lg hover:bg-red-500/25 transition"
                            >Pulei</button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onTogglePauseCommitment?.(c.id)}
                          className="text-[10px] font-medium text-white/30 hover:text-white/60 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg transition"
                        >{c.paused ? "Retomar" : "Pausar"}</button>
                        <button
                          onClick={() => onEditCommitment?.(c)}
                          className="text-[10px] font-medium text-white/30 hover:text-white/60 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg transition"
                        >Editar</button>
                        <button
                          onClick={() => onDeleteCommitment?.(c.id)}
                          aria-label={`Excluir compromisso ${c.title}`}
                          className="text-[10px] font-medium text-red-400/50 hover:text-red-400 bg-white/[0.04] border border-white/[0.07] px-2 py-0.5 rounded-lg transition"
                        >✕</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Histórico de decisões ─────────────────────────────── */}
      {subTab === "historico" && (
        <div className="px-5 pt-5 pb-24">
          {totalDecisions === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-white/40 text-sm">Nenhuma decisão ainda.</p>
              <p className="text-white/20 text-xs mt-1">Faça swipes no Início para começar.</p>
              {onNavigate && (
                <motion.button onClick={() => onNavigate("home")} className="mt-5 px-5 py-2.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white" whileTap={{ scale: 0.97 }}>
                  Ir para o Início
                </motion.button>
              )}
            </div>
          ) : (
            GROUP_ORDER.filter(g => grouped[g]?.length).map((group) => (
              <div key={group} className="mb-6">
                <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-3 pl-1">{group}</h3>
                <div className="flex flex-col gap-2">
                  {grouped[group].map((d, idx) => {
                    const { cls, icon } = badgeCfg(d.label);
                    return (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                        className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl px-3 py-2.5"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                          d.label === "Aceito" || d.label === "Feito" ? "bg-emerald-500/20" :
                          d.label === "Depois" || d.label === "Fazer" ? "bg-red-500/20" : "bg-blue-500/20"
                        }`}>
                          {d.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-white/85 truncate font-medium leading-snug">{d.title}</p>
                          <p className="text-[10px] text-white/25 mt-0.5">{d.category} · {formatTime(d.decidedAt)}</p>
                        </div>
                        <span className={`text-[9px] font-semibold px-2 py-1 rounded-xl flex-shrink-0 border ${cls}`}>
                          {icon} {d.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
