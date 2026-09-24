// Limiares de arrasto do deck de swipe (pessoal, de grupo). Compartilhado
// entre TaskMatch.jsx (GroupTaskCard) e components/SwipeCard.jsx.
export const SWIPE_THRESHOLD = 100;
export const SWIPE_UP_THRESHOLD = -80;

export function deadlineBadge(deadline) {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + "T00:00:00");
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)  return { label: "Atrasado", overdue: true };
  if (diff === 0) return { label: "Hoje",    overdue: false };
  if (diff === 1) return { label: "Amanhã",  overdue: false };
  return { label: `Em ${diff} dias`, overdue: false };
}
