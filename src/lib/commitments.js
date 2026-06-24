export const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DAY_SHORT  = ["D",   "S",   "T",   "Q",   "Q",   "S",   "S"];

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Returns true if commitment is scheduled on `date` (Date object)
export function isScheduledOnDate(commitment, date) {
  if (commitment.paused) return false;
  const dow = date.getDay(); // 0=Sun … 6=Sat
  switch (commitment.type) {
    case "weekdays":
      return (commitment.weekdays || []).includes(dow);
    case "interval": {
      const created = new Date(commitment.createdAt);
      created.setHours(0, 0, 0, 0);
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      const diff = Math.round((target - created) / 86400000);
      const n = commitment.intervalDays || 1;
      return diff >= 0 && diff % n === 0;
    }
    case "weekend":
      return dow === 0 || dow === 6;
    case "weekdays_only":
      return dow >= 1 && dow <= 5;
    case "event": {
      if (!commitment.eventDate) return false;
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      const event = new Date(commitment.eventDate + "T00:00:00");
      event.setHours(0, 0, 0, 0);
      const diffDays = Math.round((event - target) / 86400000);
      return diffDays >= 0 && diffDays <= (commitment.showBeforeDays ?? 7);
    }
    default:
      return false;
  }
}

// Find log status for a specific commitment + date
export function getLogStatus(commitmentId, dateStr, log) {
  return log.find(e => e.commitmentId === commitmentId && e.date === dateStr)?.status ?? null;
}

// Returns an array of 7 day-objects for the current week (Sun → Sat containing `today`)
export function getWeekStrip(commitment, log, today = new Date()) {
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today0);
  const dow = today0.getDay();
  const sunday = new Date(today0);
  sunday.setDate(today0.getDate() - dow);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = toDateStr(d);
    const isToday = dateStr === todayStr;
    const isPast  = d < today0;
    const isFuture = d > today0;
    const scheduled = isScheduledOnDate(commitment, d);
    const logged = getLogStatus(commitment.id, dateStr, log);

    let status;
    if (logged)              status = logged;      // "done" | "missed"
    else if (!scheduled)     status = "rest";
    else if (isToday)        status = "pending";
    else if (isFuture)       status = "future";
    else                     status = "missed";    // past scheduled, no log

    return { date: d, dateStr, dow: i, isToday, isPast, isFuture, scheduled, status };
  });
}

// Current consecutive-done streak for scheduled days
export function getStreak(commitment, log, today = new Date()) {
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today0);
  const todayLogged = getLogStatus(commitment.id, todayStr, log);

  let streak = 0;
  const d = new Date(today0);
  if (todayLogged !== "done") d.setDate(d.getDate() - 1);

  const created = new Date(commitment.createdAt);
  created.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    if (d < created) break;
    if (isScheduledOnDate(commitment, d)) {
      if (getLogStatus(commitment.id, toDateStr(d), log) === "done") streak++;
      else break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Adherence stats for last `days`
export function getAdherence(commitment, log, days = 30, today = new Date()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  let scheduled = 0, done = 0;
  for (let i = 0; i < days; i++) {
    if (isScheduledOnDate(commitment, d)) {
      scheduled++;
      if (getLogStatus(commitment.id, toDateStr(d), log) === "done") done++;
    }
    d.setDate(d.getDate() - 1);
  }
  if (scheduled === 0) return null;
  return { done, scheduled, pct: Math.round((done / scheduled) * 100) };
}

// Returns true if the commitment should appear in today's deck
export function shouldAppearInDeck(commitment, log, today = new Date()) {
  if (!isScheduledOnDate(commitment, today)) return false;
  return !getLogStatus(commitment.id, toDateStr(today), log);
}

// Human-readable recurrence label
export function recurrenceLabel(commitment) {
  switch (commitment.type) {
    case "weekdays": {
      const days = (commitment.weekdays || []).slice().sort().map(d => DAY_LABELS[d]);
      if (days.length === 0) return "Nenhum dia";
      if (days.length === 7) return "Todo dia";
      return days.join(", ");
    }
    case "interval":
      if ((commitment.intervalDays || 1) === 1) return "Todo dia";
      if ((commitment.intervalDays || 1) === 2) return "Dias alternados";
      return `A cada ${commitment.intervalDays} dias`;
    case "weekend":
      return "Fins de semana";
    case "weekdays_only":
      return "Dias úteis";
    case "event": {
      if (!commitment.eventDate) return "Evento";
      const d = new Date(commitment.eventDate + "T12:00:00");
      return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    }
    default:
      return "";
  }
}
