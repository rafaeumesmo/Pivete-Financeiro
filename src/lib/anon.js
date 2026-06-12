/*
 * Identidade anônima local — o que permite criar e votar em enquetes sem login.
 * - anon_id: uuid estável por dispositivo, guardado no localStorage. É o "dono"
 *   das enquetes criadas sem conta (migram pra conta se a pessoa logar).
 * - nick: apelido reaproveitado entre enquetes pra não pedir de novo.
 */
const ANON_KEY = "tm_anon_id";
const NICK_KEY = "tm_poll_nick";

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getAnonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) { id = uuid(); localStorage.setItem(ANON_KEY, id); }
    return id;
  } catch {
    return uuid(); // modo privado / sem storage: id volátil
  }
}

export function getNick() {
  try { return localStorage.getItem(NICK_KEY) || ""; } catch { return ""; }
}

export function setNick(nick) {
  try { localStorage.setItem(NICK_KEY, nick); } catch { /* ignore */ }
}
