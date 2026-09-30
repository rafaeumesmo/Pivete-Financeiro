// Dinheiro é sempre inteiro em centavos internamente — nunca float. Só vira
// texto "R$ 1.234,56" na borda da UI (formatBRL) e só volta a centavos na
// entrada do usuário (parseBRL / MoneyInput).

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtCompact = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Máscara do botão de olho (esconder valores): mesmo formato pra qualquer valor,
// pra não vazar nem a ordem de grandeza.
export const VALOR_OCULTO = "R$ •••••";

export function formatBRL(cents, { compact = false, oculto = false } = {}) {
  if (oculto) return VALOR_OCULTO;
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  // Intl usa NBSP entre "R$" e o número; troca por espaço comum pra não
  // quebrar comparações de texto e cópia/cola.
  return (compact ? fmtCompact : fmt).format(v).replace(/\u00a0/g, " ");
}

// "1.234,56" | "1234,56" | "1234.56" | "R$ 12" | "12,5" → centavos (inteiro).
// Retorna null se não der pra interpretar.
export function parseBRL(input) {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  if (typeof input !== "string") return null;
  let s = input.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;
  let neg = false;
  if (s.startsWith("-")) { neg = true; s = s.slice(1); }
  if (s.includes(",")) {
    // Formato BR: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/\.\d{3}(\.|$)/.test(s) && !/\.\d{1,2}$/.test(s)) {
    // "1.234" / "1.234.567" sem vírgula → pontos de milhar.
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.split(".");
  const cents = Number(int) * 100 + Number((dec + "00").slice(0, 2));
  return neg ? -cents : cents;
}

// Divide `total` em `n` partes inteiras que somam exatamente `total` — o resto
// dos centavos vai pras primeiras partes (R$ 100 / 3 → 33,34 + 33,33 + 33,33).
export function splitCents(total, n) {
  if (!Number.isInteger(n) || n < 1) return [];
  const base = Math.trunc(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < Math.abs(rest) ? Math.sign(rest) : 0));
}
