import { useState } from "react";
import { toDateStr, isScheduledOnDate, DAY_SHORT } from "../lib/commitments.js";

// Grade completa de semanas (dom→sáb) cobrindo o mês de `viewMonth`,
// incluindo dias de padding do mês anterior/seguinte pra fechar a semana.
function buildMonthGrid(viewMonth) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const days = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function monthLabel(date) {
  const s = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1).replace(" de ", " ");
}

export function ActivityCalendar({ tasks = [], commitments = [], onScheduleTask, onLogCommitment }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedStr, setSelectedStr] = useState(todayStr);

  const activeTasks = tasks.filter((t) => !t.snoozeUntil);
  const grid = buildMonthGrid(viewMonth);
  const curMonth = viewMonth.getMonth();

  function cellInfo(date) {
    const dateStr = toDateStr(date);
    const dayTasks = activeTasks.filter((t) => t.deadline === dateStr);
    const dayCommitmentCount = commitments.filter((c) => !c.paused && isScheduledOnDate(c, date)).length;
    return {
      date,
      dateStr,
      inMonth: date.getMonth() === curMonth,
      isToday: dateStr === todayStr,
      taskCount: dayTasks.length,
      commitmentCount: dayCommitmentCount,
      overdue: date < today && dayTasks.length > 0,
    };
  }

  const selectedDate = new Date(`${selectedStr}T00:00:00`);
  const selectedTasks = activeTasks.filter((t) => t.deadline === selectedStr);
  const selectedCommitments = commitments.filter((c) => !c.paused && isScheduledOnDate(c, selectedDate));
  const unscheduled = activeTasks.filter((t) => !t.deadline);
  const isSelectedToday = selectedStr === todayStr;
  const isViewingCurrentMonth = viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  function changeMonth(delta) {
    setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  function goToToday() {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedStr(todayStr);
  }

  const selectedLabel = isSelectedToday
    ? "Hoje"
    : selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 pl-1">Calendário</h3>
        {!(isViewingCurrentMonth && isSelectedToday) && (
          <button onClick={goToToday} className="text-[10px] font-semibold text-[#93c5fd] hover:text-white transition">Hoje</button>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
        {/* Navegação de mês */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button onClick={() => changeMonth(-1)} aria-label="Mês anterior" className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-[13px] font-semibold text-white capitalize">{monthLabel(viewMonth)}</span>
          <button onClick={() => changeMonth(1)} aria-label="Próximo mês" className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_SHORT.map((d, i) => (
            <div key={i} className="text-center text-[9px] font-semibold text-white/25">{d}</div>
          ))}
        </div>

        {/* Grade do mês */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {grid.map((date) => {
            const info = cellInfo(date);
            const isSelected = info.dateStr === selectedStr;
            return (
              <button
                key={info.dateStr}
                onClick={() => info.inMonth && setSelectedStr(info.dateStr)}
                disabled={!info.inMonth}
                className="flex flex-col items-center gap-0.5 py-1"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium transition ${
                    !info.inMonth
                      ? "text-white/10"
                      : isSelected
                      ? "bg-[#2563eb] text-white font-bold"
                      : info.isToday
                      ? "text-[#93c5fd] ring-1 ring-[#2563eb]/50"
                      : "text-white/60"
                  }`}
                >
                  {date.getDate()}
                </span>
                <span className="flex gap-0.5 h-1">
                  {info.inMonth && info.taskCount > 0 && (
                    <span className={`w-1 h-1 rounded-full ${info.overdue ? "bg-red-400" : "bg-[#2563eb]"}`} />
                  )}
                  {info.inMonth && info.commitmentCount > 0 && <span className="w-1 h-1 rounded-full bg-violet-400" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel do dia selecionado */}
      <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-[13px] font-semibold text-white capitalize mb-3">{selectedLabel}</p>

        {selectedCommitments.length === 0 && selectedTasks.length === 0 ? (
          <p className="text-[12px] text-white/25 py-2">Nada planejado pra esse dia.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedCommitments.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 bg-violet-500/[0.06] border border-violet-500/15 rounded-xl px-3 py-2">
                <span className="text-base flex-shrink-0">{c.emoji}</span>
                <span className="flex-1 min-w-0 text-[12px] text-white/70 truncate">{c.title}</span>
                {isSelectedToday && onLogCommitment && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => onLogCommitment(c.id, "done")} className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-lg hover:bg-emerald-500/25 transition">✓</button>
                    <button onClick={() => onLogCommitment(c.id, "missed")} className="text-[10px] font-semibold text-red-400 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-lg hover:bg-red-500/25 transition">✕</button>
                  </div>
                )}
              </div>
            ))}
            {selectedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 bg-white/[0.05] border border-white/[0.06] rounded-xl px-3 py-2">
                <span className="text-base flex-shrink-0">{t.emoji}</span>
                <span className="flex-1 min-w-0 text-[12px] text-white/80 truncate">{t.title}</span>
                {onScheduleTask && (
                  <button
                    onClick={() => onScheduleTask(t.id, null)}
                    aria-label={`Remover data de ${t.title}`}
                    className="text-white/20 hover:text-white/50 transition text-[11px] flex-shrink-0"
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tarefas sem dia — atribui pro dia selecionado no calendário acima */}
      {unscheduled.length > 0 && onScheduleTask && (
        <div className="mt-3">
          <p className="text-[10px] text-white/25 mb-2 pl-1">{unscheduled.length} sem dia definido</p>
          <div className="flex flex-col gap-2">
            {unscheduled.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-3 py-2.5">
                <span className="text-base flex-shrink-0">{t.emoji}</span>
                <span className="flex-1 min-w-0 text-[13px] text-white/80 truncate">{t.title}</span>
                <button
                  onClick={() => onScheduleTask(t.id, selectedStr)}
                  className="text-[10px] font-semibold text-[#93c5fd] bg-[#2563eb]/15 border border-[#2563eb]/25 px-2.5 py-1 rounded-lg hover:bg-[#2563eb]/25 transition flex-shrink-0 whitespace-nowrap"
                >
                  + {isSelectedToday ? "Hoje" : selectedDate.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
