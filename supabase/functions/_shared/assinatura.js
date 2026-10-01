// Regras da assinatura, puras (sem Deno nem navegador): usadas pelas Edge
// Functions e pelo app (src/lib/assinatura.js), testadas em
// src/lib/assinatura.test.js.

export const PRECO_CENTAVOS = 199;
export const MOTIVO = "Pivete Financeiro — assinatura mensal";

const STATUS = new Set(["pending", "authorized", "paused", "cancelled"]);

// Ativa = cobrança autorizada no Mercado Pago, ou cancelou/pausou mas o mês
// pago ainda não acabou. Mesma regra da função SQL assinatura_ativa().
export function assinaturaAtiva(row, agora = new Date()) {
  if (!row) return false;
  if (row.status === "authorized") return true;
  return !!row.pago_ate && new Date(row.pago_ate) > agora;
}

// Preapproval do Mercado Pago → linha da tabela assinaturas.
// pago_ate = próxima cobrança enquanto autorizada; depois de cancelar/pausar,
// fica o último valor (a pessoa usa até o fim do que já pagou).
export function linhaDaPreapproval(pre, anterior = null) {
  const status = STATUS.has(pre.status) ? pre.status : "pending";
  let pagoAte = anterior?.pago_ate ?? null;
  if (status === "authorized" && pre.next_payment_date) {
    const prox = new Date(pre.next_payment_date);
    if (!Number.isNaN(prox.getTime()) && (!pagoAte || prox > new Date(pagoAte))) pagoAte = prox.toISOString();
  }
  return { mp_preapproval_id: String(pre.id), status, pago_ate: pagoAte };
}

// Header x-signature do webhook: "ts=1704908010,v1=618c8534…" → { ts, v1 }.
export function lerXSignature(header) {
  const out = {};
  for (const parte of String(header || "").split(",")) {
    const [k, v] = parte.split("=").map((s) => s?.trim());
    if (k && v) out[k] = v;
  }
  return out.ts && out.v1 ? { ts: out.ts, v1: out.v1 } : null;
}

// Texto que o Mercado Pago assina com a chave secreta do webhook (HMAC-SHA256).
// O id vem da query string (data.id) e, se for alfanumérico, em minúsculas.
export function manifestoWebhook({ dataId, requestId, ts }) {
  let m = "";
  if (dataId) m += `id:${String(dataId).toLowerCase()};`;
  if (requestId) m += `request-id:${requestId};`;
  m += `ts:${ts};`;
  return m;
}
