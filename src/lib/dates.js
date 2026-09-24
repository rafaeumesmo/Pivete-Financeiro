// Datas "de calendário" (vencimento, dia do lançamento) são strings
// "YYYY-MM-DD" no fuso LOCAL. Nunca usar toISOString() pra isso: em UTC-3,
// depois das 21h ele já devolve o dia seguinte.

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateStr(s) { return new Date(s + "T00:00:00"); }

export function todayKey(now = new Date()) { return toDateStr(now); }

export function daysBetween(a, b) {
  return Math.round((fromDateStr(b) - fromDateStr(a)) / 86400000);
}

export function addDays(dateStr, n) {
  const d = fromDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function lastDayOfMonth(year, month0) { return new Date(year, month0 + 1, 0).getDate(); }

// Mesmo dia `day` no mês (year, month0), limitado ao último dia do mês
// (dia 31 em fevereiro → 28/29).
export function dateInMonth(year, month0, day) {
  const d = Math.min(Math.max(1, day), lastDayOfMonth(year, month0));
  return toDateStr(new Date(year, month0, d));
}

export function addMonths(dateStr, n, day = null) {
  const d = fromDateStr(dateStr);
  const total = d.getFullYear() * 12 + d.getMonth() + n;
  return dateInMonth(Math.floor(total / 12), total % 12, day ?? d.getDate());
}

export function monthKey(dateStr) { return dateStr.slice(0, 7); }

export function endOfMonth(dateStr) {
  const d = fromDateStr(dateStr);
  return dateInMonth(d.getFullYear(), d.getMonth(), 31);
}

export function formatDateShort(dateStr) {
  return fromDateStr(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function formatMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatSnoozeReturn(snoozeUntil) {
  const diff = new Date(snoozeUntil) - new Date();
  if (diff <= 0) return "agora";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `em ${mins} min`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `em ${hours}h`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

// Quando um item adiado volta: "1h" → daqui 1 hora; "1d" → amanhã, mesmo horário.
export function computeSnoozeUntil(pref, now = new Date()) {
  const d = new Date(now);
  if (pref === "1h") d.setHours(d.getHours() + 1);
  else d.setDate(d.getDate() + 1);
  return d.toISOString();
}
