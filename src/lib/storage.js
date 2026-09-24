import { useState, useCallback } from "react";

// ── Storage keys ─────────────────────────────────────────────
// Tudo é local-first: estes dados nunca vão pro Supabase. Só o que o usuário
// escolhe compartilhar (divisões, cobranças, enquetes) sai do aparelho.
export const SK = {
  // Finanças
  lancamentos:   "fin_lancamentos",
  recorrentes:   "fin_recorrentes",
  dividas:       "fin_dividas",
  contas:        "fin_contas",
  metas:         "fin_metas",
  categorias:    "fin_categorias",
  revisoes:      "fin_revisoes",       // { [itemKey]: { veredito: "valeu" | "cortar", em } }
  contaPadrao:   "fin_conta_padrao",   // id da última conta usada pra pagar
  reservaMeses:  "fin_reserva_meses",  // meta de reserva de emergência, em meses de custo
  conquistas:    "fin_conquistas",     // { [id]: data em que desbloqueou } — nunca "perde" uma conquista
  // Engajamento / app
  stats:         "fin_stats",
  invites:       "fin_invites",
  profile:       "fin_profile",
  decisions:     "fin_decisions",      // histórico imutável de swipes
  exploreSeenAt: "fin_explore_seen_at",
  streak:        "fin_streak",
  notifs:        "fin_notifs",
  snoozeDefault: "fin_snooze_default", // "1h" | "1d"
  snoozeAsked:   "fin_snooze_asked",
  onboarded:     "fin_onboarded",
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Dispara um evento em vez de lançar: save() é chamada fora de componentes
// (dentro de setState updaters), então não há como mostrar toast direto daqui.
// O componente principal escuta "fin:storage-error" e avisa o usuário.
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    try { window.dispatchEvent(new CustomEvent("fin:storage-error", { detail: { key, err } })); } catch {}
  }
}

export function usePersistedState(key, fallback) {
  const [state, setState] = useState(() => load(key, fallback));
  const set = useCallback((valueOrUpdater) => {
    setState((prev) => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      save(key, next);
      return next;
    });
  }, [key]);
  return [state, set];
}
