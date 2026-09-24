import { useState, useCallback, useEffect, useRef } from "react";

// ── Storage keys ─────────────────────────────────────────────
// Tudo é local-first: sem login, estes dados nunca saem do aparelho. Logado,
// as chaves de SYNC_KEYS (lib/sync.js) são espelhadas na tabela user_data pra
// aparecerem em outros navegadores.
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
  cobrancas:     "fin_cobrancas",      // cobranças de contas divididas (links enviados + o que já recebi)
  pixKey:        "fin_pix_key",        // chave Pix que vai no link de cobrança (opcional)
  profile:       "fin_profile",
  decisions:     "fin_decisions",      // histórico imutável de swipes
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
  saveHook?.(key);
}

// lib/sync.js se registra aqui pra saber o que mudou (evita import circular).
let saveHook = null;
export function setSaveHook(fn) { saveHook = fn; }

// Evento disparado por lib/sync.js quando uma chave chega do servidor.
export const REMOTE_UPDATE_EVENT = "fin:remote-update";

export function usePersistedState(key, fallback) {
  const [state, setState] = useState(() => load(key, fallback));
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    const onRemote = (e) => { if (e.detail?.key === key) setState(load(key, fallbackRef.current)); };
    window.addEventListener(REMOTE_UPDATE_EVENT, onRemote);
    return () => window.removeEventListener(REMOTE_UPDATE_EVENT, onRemote);
  }, [key]);

  const set = useCallback((valueOrUpdater) => {
    setState((prev) => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      save(key, next);
      return next;
    });
  }, [key]);
  return [state, set];
}
