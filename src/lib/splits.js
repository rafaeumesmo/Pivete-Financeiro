// Saldos da divisão de contas (estilo Splitwise), calculados no cliente a
// partir do que veio do Supabase. Funções puras, valores em centavos.

// Saldo entre MIM e cada pessoa: > 0 = a pessoa me deve; < 0 = eu devo a ela.
// expenses: [{ paid_by, shares: [{ user_id, amount_cents }] }]
// settlements: [{ from_user, to_user, amount_cents }] (from pagou to)
export function saldosComigo(expenses, settlements, me) {
  const s = {};
  const add = (u, v) => { s[u] = (s[u] || 0) + v; };
  for (const e of expenses) {
    for (const sh of e.shares || []) {
      if (sh.user_id === e.paid_by) continue;
      if (e.paid_by === me) add(sh.user_id, sh.amount_cents);      // pagou por mim → me deve
      else if (sh.user_id === me) add(e.paid_by, -sh.amount_cents); // eu devo a quem pagou
    }
  }
  for (const st of settlements) {
    if (st.to_user === me) add(st.from_user, -st.amount_cents); // me pagou → deve menos
    else if (st.from_user === me) add(st.to_user, st.amount_cents); // eu paguei → devo menos
  }
  for (const k of Object.keys(s)) if (s[k] === 0) delete s[k];
  return s;
}

export function totaisSaldos(saldos) {
  let aReceber = 0, aPagar = 0;
  for (const v of Object.values(saldos)) { if (v > 0) aReceber += v; else aPagar -= v; }
  return { aReceber, aPagar, liquido: aReceber - aPagar };
}

// Divide `total` igualmente entre `userIds` (resto dos centavos vai pros
// primeiros), devolvendo as partes no formato de split_shares.
export function partesIguais(total, userIds) {
  const n = userIds.length;
  if (!n) return [];
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return userIds.map((user_id, i) => ({ user_id, amount_cents: base + (i < resto ? 1 : 0) }));
}
