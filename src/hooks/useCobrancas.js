import { SK, usePersistedState } from "../lib/storage.js";
import { makeId } from "../lib/finance.js";
import { APP_NAME } from "../config.js";

// Codifica o conteúdo do link em base64 URL-safe (sobrevive a WhatsApp/SMS).
export function encodePayload(obj) {
  return btoa(encodeURIComponent(JSON.stringify(obj))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decodePayload(s) {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b.length % 4 ? b + "=".repeat(4 - (b.length % 4)) : b;
    return JSON.parse(decodeURIComponent(atob(padded)));
  } catch {
    return null;
  }
}

// Cobranças locais: nascem quando uma conta é dividida no deck. O link leva
// só o necessário pra quem vai pagar (título, valor por pessoa, nome e Pix
// opcional) — nada do extrato de quem cobra.
export function useCobrancas(finance) {
  const [cobrancas, setCobrancas] = usePersistedState(SK.cobrancas, []);
  const [pixKey, setPixKey] = usePersistedState(SK.pixKey, "");

  function criar(l) {
    const c = {
      id: l.divisao.cobrancaId, lancamentoId: l.id, titulo: l.descricao, total: l.valor,
      porPessoa: l.divisao.porPessoa, partes: l.divisao.partes, aReceber: l.divisao.aReceber,
      criadaEm: new Date().toISOString(), recebidos: [], arquivada: false,
    };
    setCobrancas(prev => [c, ...prev]);
    return c;
  }

  function link(c, nome) {
    const payload = { v: 1, id: c.id, t: c.titulo, p: c.porPessoa, n: c.partes, de: nome || "", ...(pixKey.trim() ? { pix: pixKey.trim() } : {}) };
    return `${window.location.origin}${window.location.pathname}#/cobranca/${encodePayload(payload)}`;
  }

  async function compartilhar(c, nome, showToast) {
    const url = link(c, nome);
    const text = `${c.titulo}: sua parte é ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.porPessoa / 100)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${APP_NAME}: ${c.titulo}`, text, url }); return; } catch { /* cancelado → cai pro copiar */ }
    }
    try { await navigator.clipboard?.writeText(url); showToast?.("Link de cobrança copiado!", "bg-emerald-600/90"); }
    catch { window.prompt("Copie o link:", url); }
  }

  // Recebi de alguém: credita a conta (é reembolso, não renda) e anota.
  function registrarRecebimento(cobrancaId, { nome, valor, contaId }) {
    finance.moverSaldo(contaId, valor);
    setCobrancas(prev => prev.map(c => c.id === cobrancaId
      ? { ...c, recebidos: [...c.recebidos, { id: makeId("rec"), nome: nome.trim() || "Alguém", valor, contaId, em: new Date().toISOString() }] }
      : c));
  }

  function arquivar(cobrancaId, arquivada = true) {
    setCobrancas(prev => prev.map(c => c.id === cobrancaId ? { ...c, arquivada } : c));
  }

  function remover(cobrancaId) {
    setCobrancas(prev => prev.filter(c => c.id !== cobrancaId));
  }

  return { cobrancas, setCobrancas, pixKey, setPixKey, criar, link, compartilhar, registrarRecebimento, arquivar, remover };
}
