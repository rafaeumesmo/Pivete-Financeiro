export function todayKey() { return new Date().toISOString().slice(0, 10); }

export function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00"), d2 = new Date(b + "T00:00:00");
  return Math.round((d2 - d1) / 86400000);
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
