import { supabase } from "../supabaseClient";
import {
  SK, DADOS_KEYS, load, save, setSaveHook, REMOTE_UPDATE_EVENT, dadosPersistentes, tornarPersistente, tornarTemporario,
} from "./storage.js";
import { planSync } from "./syncPlan.js";

/*
 * Espelha os dados pessoais (localStorage) na tabela user_data quando o
 * usuário está logado, pra que apareçam em qualquer navegador.
 *
 * - Cada save() de uma chave sincronizada marca a chave como "suja" e agenda
 *   um upsert (debounce). As chaves sujas ficam salvas no localStorage, então
 *   uma edição feita offline sobe no próximo login/foco.
 * - Ao logar e ao voltar pra aba, baixa o que está no servidor. Chave suja ou
 *   com envio pendente não é sobrescrita: a edição local vence.
 * - Conflito entre dois aparelhos editando ao mesmo tempo: o último envio vence.
 */

// Configurações do aparelho (notificações, onboarding, soneca) ficam de fora.
export const SYNC_KEYS = [...DADOS_KEYS, SK.tema];

const OWNER_KEY = SK.syncOwner;
const DIRTY_KEY = "fin_sync_dirty"; // chaves alteradas que ainda não subiram
const PUSH_DELAY_MS = 800;
const PULL_THROTTLE_MS = 15_000;

let userId = null;
let ready = false;          // startSync terminou (conta e aparelho alinhados)
let session = 0;            // invalida respostas de um login anterior
let lastPull = 0;
const timers = new Map();   // key → timeout do envio agendado

function hasLocal(key) {
  try { return localStorage.getItem(key) !== null; } catch { return false; }
}
function getDirty() { return load(DIRTY_KEY, []); }
function setDirty(keys) { save(DIRTY_KEY, [...new Set(keys)]); }

function notify(key) {
  try { window.dispatchEvent(new CustomEvent(REMOTE_UPDATE_EVENT, { detail: { key } })); } catch { /* ignore */ }
}

// Grava o valor vindo do servidor sem passar pelo save() (senão viraria envio).
function applyRemote(key, value) {
  try {
    const raw = value === null ? null : JSON.stringify(value);
    if (localStorage.getItem(key) === raw) return;
    if (raw === null) localStorage.removeItem(key);
    else localStorage.setItem(key, raw);
  } catch { return; }
  notify(key);
}

// Retorna true se as chaves chegaram ao servidor.
async function push(keys) {
  if (!supabase || !userId) return false;
  if (keys.length === 0) return true;
  const mySession = session;
  const updatedAt = new Date().toISOString();
  const rows = keys.map((key) => ({ user_id: userId, key, value: load(key, null), updated_at: updatedAt }));
  const { error } = await supabase.from("user_data").upsert(rows, { onConflict: "user_id,key" });
  if (mySession !== session) return false;
  if (error) { console.warn("[sync] falha ao enviar:", error.message); return false; }
  // Só limpa o que não voltou a mudar enquanto o envio estava no ar.
  setDirty(getDirty().filter((k) => !keys.includes(k) || timers.has(k)));
  return true;
}

function schedulePush(key) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => { timers.delete(key); push([key]); }, PUSH_DELAY_MS));
}

function flushPending() {
  const keys = [...timers.keys()];
  keys.forEach((k) => clearTimeout(timers.get(k)));
  timers.clear();
  push(keys);
}

async function fetchRemote() {
  const { data, error } = await supabase.from("user_data").select("key, value").eq("user_id", userId);
  if (error) throw error;
  return (data || []).filter((r) => SYNC_KEYS.includes(r.key));
}

// Atualiza com o servidor, sem mexer em chave suja ou com envio pendente.
async function pull() {
  if (!supabase || !userId) return;
  const mySession = session;
  lastPull = Date.now();
  try {
    const rows = await fetchRemote();
    if (mySession !== session) return;
    const skip = new Set([...getDirty(), ...timers.keys()]);
    rows.filter((r) => !skip.has(r.key)).forEach((r) => applyRemote(r.key, r.value));
  } catch (err) {
    console.warn("[sync] falha ao baixar:", err.message);
  }
}

function onVisibility() {
  if (document.visibilityState === "hidden") flushPending();
  else if (Date.now() - lastPull > PULL_THROTTLE_MS) pull();
}

setSaveHook((key) => {
  if (!userId || !SYNC_KEYS.includes(key)) return;
  setDirty([...getDirty(), key]);
  schedulePush(key);
});

export async function startSync(uid) {
  if (!supabase || !uid || uid === userId) return;
  stopSync();
  userId = uid;
  const mySession = ++session;

  // Acabou de entrar: o que foi feito sem conta nesta aba vira dado local e o
  // planSync decide o que sobe. Sobra de outra conta no aparelho sai antes,
  // pra não se misturar (o planSync apagaria tudo junto, inclusive o da aba).
  if (!dadosPersistentes()) {
    const owner = load(OWNER_KEY, null);
    if (owner && owner !== uid) {
      SYNC_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
      setDirty([]);
      try { localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
    }
    tornarPersistente();
  }

  let rows;
  try {
    rows = await fetchRemote();
  } catch (err) {
    console.warn("[sync] falha ao baixar:", err.message);
    return; // sem conseguir ler o servidor, não arrisca sobrescrever nada
  }
  if (mySession !== session) return;
  lastPull = Date.now();

  const plan = planSync({
    uid,
    owner: load(OWNER_KEY, null),
    localKeys: SYNC_KEYS.filter(hasLocal),
    remoteKeys: rows.map((r) => r.key),
    dirtyKeys: getDirty().filter((k) => SYNC_KEYS.includes(k)),
  });

  if (plan.wipeLocal) {
    setDirty([]);
    SYNC_KEYS.forEach((k) => applyRemote(k, null));
  }
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  plan.apply.forEach((k) => applyRemote(k, byKey.get(k)));
  // Conta que já tem dados não refaz o tutorial (onboarded é por aparelho:
  // num navegador ou domínio novo ele começa vazio).
  if (rows.length > 0 && !load(SK.onboarded, false)) applyRemote(SK.onboarded, true);
  save(OWNER_KEY, uid);
  await push(plan.push);
  if (mySession !== session) return;
  ready = true;

  document.addEventListener("visibilitychange", onVisibility);
}

export function stopSync() {
  if (!userId) return;
  flushPending();
  document.removeEventListener("visibilitychange", onVisibility);
  userId = null;
  ready = false;
  session++;
}

// Logout: envia o que ainda não subiu e apaga os dados pessoais deste
// navegador (continuam na conta). Se não der pra garantir que está tudo no
// servidor, retorna false sem apagar nada; com force: true apaga mesmo assim.
export async function finishSync({ force = false } = {}) {
  if (userId && !force) {
    if (!ready) return false;
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    if (!(await push(getDirty().filter((k) => SYNC_KEYS.includes(k))))) return false;
  }
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  stopSync();
  SYNC_KEYS.forEach((k) => applyRemote(k, null));
  setDirty([]);
  try { localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
  tornarTemporario();
  return true;
}
