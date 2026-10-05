import { useState, useCallback, useEffect, useRef } from "react";

// ── Storage keys ─────────────────────────────────────────────
// Três modos (decididos no boot, iniciarArmazenamento):
//   conta   — tem sessão: localStorage + espelho na tabela user_data (lib/sync.js)
//   legado  — sem sessão, mas o aparelho já tem dados reais (do modo convidado
//             que existiu até 10/2026): localStorage; ao criar conta, a junção
//             de lib/mesclar.js leva tudo
//   exemplo — sem sessão e sem dados: um mês fictício SÓ NA MEMÓRIA. Nada vai
//             pro localStorage, recarregar volta ao início e nunca sobe pra conta.
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
  tema:          "fin_tema",           // "escuro" | "claro" — acompanha a conta (SYNC_KEYS)
  ocultarValores: "fin_ocultar_valores", // botão de olho do perfil — por aparelho, fora de SYNC_KEYS
  landingSeen:   "fin_landing_seen",   // clicou "Começar" na Landing — por aparelho, fora de SYNC_KEYS
  reciboVisto:   "fin_recibo_visto",   // mês (YYYY-MM) do recibo já aberto/dispensado — some o aviso da Início
  saiuDaConta:   "fin_saiu_da_conta",  // deslogou: abre na Landing (modo "entrar de novo") até logar ou escolher usar sem conta
  syncOwner:     "fin_sync_owner",     // id do usuário dono dos dados deste navegador (lib/sync.js)
};

// Dados pessoais — o que sincroniza com a conta (SYNC_KEYS = estes + tema).
export const DADOS_KEYS = [
  SK.lancamentos, SK.recorrentes, SK.dividas, SK.contas, SK.metas, SK.categorias,
  SK.revisoes, SK.contaPadrao, SK.reservaMeses, SK.conquistas, SK.stats,
  SK.cobrancas, SK.pixKey, SK.profile, SK.decisions, SK.streak,
];
// No modo exemplo estas ficam na memória; o resto (tema, olho de ocultar,
// já passou da Landing…) é preferência do aparelho e segue no localStorage.
const DO_EXEMPLO = new Set([...DADOS_KEYS, SK.onboarded, SK.reciboVisto, SK.notifs, SK.snoozeAsked, SK.snoozeDefault]);
// Até 10/2026 o convidado vivia só na aba (sessionStorage).
const DA_ABA = [...DADOS_KEYS, SK.onboarded, SK.landingSeen];

let modo = "conta";
const memoria = new Map();
let gerarExemplo = () => ({});

export function modoArmazenamento() { return modo; }

// Dado real no aparelho sem sessão: algum dado pessoal com conteúdo.
export function temDadosNoAparelho() {
  const vazio = new Set(["[]", "{}", "null", '""']);
  try { return DADOS_KEYS.some((k) => { const v = localStorage.getItem(k); return v !== null && !vazio.has(v); }); }
  catch { return false; }
}

// Boot (main.jsx, antes do primeiro render). `exemplo` gera o mês fictício
// ({ chave: valor }). Aba aberta numa versão antiga ainda tem o convidado no
// sessionStorage: passa pro localStorage antes de decidir o modo.
export function iniciarArmazenamento({ temSessao = false, exemplo } = {}) {
  if (exemplo) gerarExemplo = exemplo;
  try {
    DA_ABA.forEach((k) => {
      const v = sessionStorage.getItem(k);
      if (v !== null && localStorage.getItem(k) === null) localStorage.setItem(k, v);
      sessionStorage.removeItem(k);
    });
  } catch { /* storage bloqueado */ }
  if (temSessao) modo = "conta";
  else if (temDadosNoAparelho()) modo = "legado";
  else entrarNoExemplo();
  return modo;
}

// (Re)começa o mês de exemplo do zero — no boot e ao escolher "Ver como
// funciona" depois de sair da conta.
export function entrarNoExemplo() {
  modo = "exemplo";
  memoria.clear();
  for (const [k, v] of Object.entries(gerarExemplo())) memoria.set(k, JSON.stringify(v));
}

// Login com sessão nova nesta aba. Exemplo: devolve true — a página tem que
// recarregar (a memória some e o boot entra em "conta" com o aparelho vazio,
// então nada do exemplo sobe). Legado: os dados do aparelho seguem pra junção.
export function aoEntrarNaConta() {
  if (modo === "exemplo") return true;
  modo = "conta";
  return false;
}

const naMemoria = (key) => modo === "exemplo" && DO_EXEMPLO.has(key);

export function load(key, fallback) {
  try {
    const raw = naMemoria(key) ? (memoria.has(key) ? memoria.get(key) : null) : localStorage.getItem(key);
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
  if (naMemoria(key)) { memoria.set(key, JSON.stringify(value)); return; } // exemplo: nem chama o saveHook da sync
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
