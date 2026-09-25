// Regras de negócio financeiras — funções puras, sem React nem localStorage,
// pra poderem ser testadas isoladamente (finance.test.js). Todo valor é
// inteiro em centavos; toda data de calendário é "YYYY-MM-DD" local.
import {
  toDateStr, fromDateStr, addDays, addMonths, dateInMonth, endOfMonth, monthKey, daysBetween,
} from "./dates.js";

export const DECK_HORIZON_DAYS = 7;
export const JUROS_ALTO_MES = 5; // % a.m. a partir do qual a dívida ganha destaque

// Id imprevisível pra coisas que viram link público (cobrança).
export function randomId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }
}

let _seq = 0;
export function makeId(prefix) {
  _seq = (_seq + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}-${_seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── Lançamentos ──────────────────────────────────────────────

// Quanto o lançamento pesa pra MIM: conta dividida com outras pessoas conta
// só a minha parte (o resto é a receber, ver Social).
export function custoEfetivo(l) {
  return l.divisao ? l.divisao.minhaParte : l.valor;
}

export function adiamentoExpirado(l, now = new Date()) {
  return l.status === "adiado" && (!l.adiadoAte || new Date(l.adiadoAte) <= now);
}

// Deck da aba Início: pendentes (ou adiados cujo prazo já passou) com
// vencimento até hoje + 7 dias. Ordenado com o mais urgente no FIM do array,
// que é o topo da pilha de cards.
export function deckLancamentos(lancamentos, now = new Date()) {
  const limite = addDays(toDateStr(now), DECK_HORIZON_DAYS);
  return lancamentos
    .filter(l => l.data && l.data <= limite && (l.status === "pendente" || adiamentoExpirado(l, now)))
    .sort((a, b) => (b.data < a.data ? -1 : b.data > a.data ? 1 : b.valor - a.valor));
}

// { dias, label, atrasado } — dias < 0 = vencido. Entradas falam em
// "previsto" em vez de "vence".
export function vencimentoInfo(data, hoje = toDateStr(new Date()), tipo = "saida") {
  if (!data) return { dias: null, label: "Sem vencimento", atrasado: false };
  const dias = daysBetween(hoje, data);
  if (tipo === "entrada") {
    if (dias < 0) return { dias, label: dias === -1 ? "Previsto pra ontem" : `Previsto há ${-dias} dias`, atrasado: true };
    if (dias === 0) return { dias, label: "Previsto pra hoje", atrasado: false };
    if (dias === 1) return { dias, label: "Previsto pra amanhã", atrasado: false };
    return { dias, label: `Previsto em ${dias} dias`, atrasado: false };
  }
  if (dias < -1) return { dias, label: `Venceu há ${-dias} dias`, atrasado: true };
  if (dias === -1) return { dias, label: "Venceu ontem", atrasado: true };
  if (dias === 0) return { dias, label: "Vence hoje", atrasado: false };
  if (dias === 1) return { dias, label: "Vence amanhã", atrasado: false };
  return { dias, label: `Vence em ${dias} dias`, atrasado: false };
}

// Parcelamento: gera N lançamentos mensais ligados pelo mesmo grupoId. Os
// centavos que sobram da divisão vão pra 1ª parcela, então a soma bate
// exatamente com o total.
export function gerarParcelamento({ valorTotal, parcelas, data, descricao, ...base }) {
  const n = Math.max(1, Math.floor(parcelas));
  const grupoId = makeId("parc");
  const baseValor = Math.floor(valorTotal / n);
  const resto = valorTotal - baseValor * n;
  const dia = fromDateStr(data).getDate();
  return Array.from({ length: n }, (_, k) => ({
    ...base,
    id: makeId("l"),
    valor: baseValor + (k === 0 ? resto : 0),
    data: addMonths(data, k, dia),
    descricao: `${descricao} (${k + 1}/${n})`,
    status: "pendente",
    parcela: { grupoId, numero: k + 1, total: n },
  }));
}

// ── Recorrentes ──────────────────────────────────────────────
export const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function diaSemanaLabel(dow) {
  return `${dow === 0 || dow === 6 ? "Todo" : "Toda"} ${DAY_NAMES[dow]}`;
}

export function frequenciaLabel(rec) {
  return rec.frequencia === "semanal" ? diaSemanaLabel(rec.diaSemana) : `Todo dia ${rec.dia}`;
}
// frequencia: "mensal" (todo mês no `dia`) | "semanal" (toda semana no `diaSemana`, 0=dom)

export function ocorrencias(rec, de, ate) {
  if (de > ate) return [];
  const out = [];
  if (rec.frequencia === "semanal") {
    let d = de;
    const diff = (rec.diaSemana - fromDateStr(d).getDay() + 7) % 7;
    d = addDays(d, diff);
    while (d <= ate) { out.push(d); d = addDays(d, 7); }
    return out;
  }
  const start = fromDateStr(de), end = fromDateStr(ate);
  const first = start.getFullYear() * 12 + start.getMonth();
  const last = end.getFullYear() * 12 + end.getMonth();
  for (let k = first; k <= last; k++) {
    const d = dateInMonth(Math.floor(k / 12), k % 12, rec.dia || 1);
    if (d >= de && d <= ate) out.push(d);
  }
  return out;
}

export function valorMensal(rec) {
  return rec.frequencia === "semanal" ? Math.round((rec.valor * 52) / 12) : rec.valor;
}

// Até onde gerar lançamentos concretos: fim do mês corrente, ou 7 dias à
// frente se isso passar da virada do mês (o deck sempre enxerga 7 dias).
export function horizonteGeracao(hoje) {
  const a = endOfMonth(hoje);
  const b = addDays(hoje, DECK_HORIZON_DAYS);
  return a > b ? a : b;
}

// Gera os lançamentos pendentes das recorrências e dívidas desde a última
// geração (`geradoAte`) até o horizonte. Guardar `geradoAte` em vez de checar
// "já existe lançamento nessa data" faz um lançamento apagado pelo usuário
// continuar apagado. O id é determinístico (origem + data) pra que quem
// junta os novos na lista possa descartar duplicata (ver mergeNovos).
export function materializar({ recorrentes, dividas }, hoje) {
  const ate = horizonteGeracao(hoje);
  const novos = [];

  const recs = recorrentes.map(rec => {
    if (!rec.ativo) return rec;
    const de = rec.geradoAte ? addDays(rec.geradoAte, 1) : (rec.inicio || hoje);
    if (de > ate) return rec;
    for (const data of ocorrencias(rec, de, ate)) {
      novos.push({
        id: `r:${rec.id}:${data}`, tipo: rec.tipo, valor: rec.valor, categoria: rec.categoria,
        descricao: rec.nome, data, status: "pendente", recorrenteId: rec.id,
      });
    }
    return { ...rec, geradoAte: ate };
  });

  const divs = dividas.map(d => {
    if (d.saldoDevedor <= 0 || d.parcela <= 0) return d;
    const de = d.geradoAte ? addDays(d.geradoAte, 1) : (d.inicio || hoje);
    if (de > ate) return d;
    for (const data of ocorrencias({ frequencia: "mensal", dia: d.diaVencimento }, de, ate)) {
      novos.push({
        id: `d:${d.id}:${data}`, tipo: "saida", valor: d.parcela, categoria: "dividas",
        descricao: d.credor ? `${d.nome} · ${d.credor}` : d.nome, data, status: "pendente", dividaId: d.id,
      });
    }
    return { ...d, geradoAte: ate };
  });

  return { novos, recorrentes: recs, dividas: divs };
}

export function mergeNovos(lancamentos, novos) {
  if (!novos.length) return lancamentos;
  const ids = new Set(lancamentos.map(l => l.id));
  const add = novos.filter(l => !ids.has(l.id));
  return add.length ? [...lancamentos, ...add] : lancamentos;
}

// ── Dívidas ──────────────────────────────────────────────────

// Pagamento de uma parcela: primeiro paga os juros do mês sobre o saldo, o
// resto amortiza. Se a parcela não cobre os juros, o saldo cresce.
export function aplicarPagamento(divida, valorPago) {
  const juros = Math.round(divida.saldoDevedor * (divida.jurosMes || 0) / 100);
  const amortizacao = valorPago - juros;
  const saldoDevedor = Math.max(0, divida.saldoDevedor - amortizacao);
  return { juros, amortizacao, saldoDevedor };
}

// Parcelas restantes pela Tabela Price: n = -ln(1 - i·S/P) / ln(1 + i).
// Infinity = a parcela não cobre nem os juros, a dívida nunca acaba.
export function parcelasRestantes(divida) {
  const S = divida.saldoDevedor, P = divida.parcela, i = (divida.jurosMes || 0) / 100;
  if (S <= 0) return 0;
  if (P <= 0) return Infinity;
  if (i === 0) return Math.ceil(S / P);
  if (P <= S * i) return Infinity;
  return Math.ceil(-Math.log(1 - (i * S) / P) / Math.log(1 + i) - 1e-9);
}

export function jurosAlto(divida) { return (divida.jurosMes || 0) >= JUROS_ALTO_MES; }

// ── Resumos ──────────────────────────────────────────────────

const sum = (arr, f) => arr.reduce((acc, x) => acc + f(x), 0);

export function lancamentosDoMes(lancamentos, ym) {
  return lancamentos.filter(l => l.data && monthKey(l.data) === ym);
}

// Contagem dos swipes do mês (pagas / adiadas / divididas). Só conta decisão
// cujo lançamento ainda existe: apagou do histórico, some da contagem.
export function decisoesDoMes(decisions, lancamentos, ym) {
  const ids = new Set(lancamentos.map(l => l.id));
  const out = { accepted: 0, rejected: 0, shared: 0 };
  const chave = { right: "accepted", left: "rejected", up: "shared" };
  for (const d of decisions) {
    const k = chave[d.direction];
    if (!k || !ids.has(d.lancamentoId) || !d.decidedAt) continue;
    if (toDateStr(new Date(d.decidedAt)).slice(0, 7) === ym) out[k]++;
  }
  return out;
}

export function resumoMes(lancamentos, ym) {
  const doMes = lancamentosDoMes(lancamentos, ym);
  const entradas = doMes.filter(l => l.tipo === "entrada");
  const saidas = doMes.filter(l => l.tipo === "saida");
  const porCategoria = {};
  for (const l of saidas) porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + custoEfetivo(l);
  const totalEntradas = sum(entradas, l => l.valor);
  const totalSaidas = sum(saidas, custoEfetivo);
  return {
    entradas: totalEntradas,
    saidas: totalSaidas,
    sobra: totalEntradas - totalSaidas,
    saidasPagas: sum(saidas.filter(l => l.status === "pago"), custoEfetivo),
    saidasPendentes: sum(saidas.filter(l => l.status !== "pago"), custoEfetivo),
    porCategoria,
  };
}

export function rendaMensal(recorrentes) {
  return sum(recorrentes.filter(r => r.ativo && r.tipo === "entrada"), valorMensal);
}

export function fixosMensais(recorrentes) {
  return sum(recorrentes.filter(r => r.ativo && r.tipo === "saida"), valorMensal);
}

export function parcelasDividasMensais(dividas) {
  return sum(dividas.filter(d => d.saldoDevedor > 0), d => d.parcela);
}

// Quanto da renda já está comprometido com fixos + parcelas de dívida (0–1+).
export function comprometimento({ recorrentes, dividas, renda }) {
  if (!renda) return null;
  return (fixosMensais(recorrentes) + parcelasDividasMensais(dividas)) / renda;
}

// Tenho = saldos positivos das contas (tudo que entrou − saiu) + caixinhas;
// nunca fica abaixo de zero. Conta no vermelho não abate o "tenho": entra no
// "devo", junto com o saldo devedor das dívidas. `caixa` é a soma crua dos
// saldos (pode ser negativa), pra projeção partir do dinheiro real.
export function patrimonio({ contas, metas, dividas }) {
  const caixa = sum(contas, c => c.saldo);
  const tenho = sum(contas, c => Math.max(0, c.saldo)) + sum(metas, m => Math.max(0, m.guardado));
  const devo = sum(contas, c => Math.max(0, -c.saldo)) + sum(dividas, d => Math.max(0, d.saldoDevedor));
  return { tenho, devo, liquido: tenho - devo, caixa: caixa + sum(metas, m => Math.max(0, m.guardado)) };
}

// Média mensal das saídas avulsas (sem recorrência nem dívida) nos últimos
// `meses` meses fechados — a parte "variável" do custo de vida.
export function gastoVariavelMedio(lancamentos, hoje, meses = 3) {
  let total = 0, comDados = 0;
  for (let k = 1; k <= meses; k++) {
    const ym = monthKey(addMonths(hoje, -k, 1));
    const avulsas = lancamentosDoMes(lancamentos, ym).filter(l => l.tipo === "saida" && !l.recorrenteId && !l.dividaId);
    if (avulsas.length) { total += sum(avulsas, custoEfetivo); comDados++; }
  }
  return comDados ? Math.round(total / comDados) : 0;
}

// Projeção de 12 meses sem juros extras (só os juros contratados, sem atraso
// nem dívida nova): a cada mês entra a renda, saem fixos + variável + parcelas;
// quando uma dívida termina, a parcela dela vira sobra.
export function projecao12m({ tenho, dividas, renda, fixos, variavel = 0, meses = 12 }) {
  let t = tenho;
  const ds = dividas.filter(d => d.saldoDevedor > 0).map(d => ({ S: d.saldoDevedor, i: (d.jurosMes || 0) / 100, P: d.parcela }));
  const out = [{ mes: 0, tenho: t, divida: sum(ds, d => d.S) }];
  for (let m = 1; m <= meses; m++) {
    let pago = 0;
    for (const d of ds) {
      if (d.S <= 0) continue;
      d.S = d.S * (1 + d.i);
      const p = Math.min(d.P, d.S);
      d.S -= p;
      if (d.S < 1) d.S = 0;
      pago += p;
    }
    t += renda - fixos - variavel - pago;
    out.push({ mes: m, tenho: Math.round(t), divida: Math.round(sum(ds, d => d.S)) });
  }
  return out;
}

// ── Revisar gastos ───────────────────────────────────────────
// Itens a revisar: fixos de saída ativos (valor mensal) + saídas avulsas pagas
// nos últimos 30 dias. Um item revisado há menos de 30 dias não volta.
export const REVISAO_JANELA_DIAS = 30;

export function itensRevisao({ recorrentes, lancamentos }, hoje) {
  const desde = addDays(hoje, -REVISAO_JANELA_DIAS);
  const fixos = recorrentes
    .filter(r => r.ativo && r.tipo === "saida")
    .map(r => ({ key: `rec:${r.id}`, nome: r.nome, categoria: r.categoria, valorMensal: valorMensal(r), origem: "fixo", frequencia: r.frequencia }));
  const avulsos = lancamentos
    .filter(l => l.tipo === "saida" && l.status === "pago" && !l.recorrenteId && !l.dividaId && l.data && l.data >= desde && l.data <= hoje)
    .map(l => ({ key: `lan:${l.id}`, nome: l.descricao, categoria: l.categoria, valorMensal: custoEfetivo(l), origem: "avulso", data: l.data }));
  return [...fixos, ...avulsos];
}

export function revisaoPendente(itens, revisoes, now = new Date()) {
  const limite = now.getTime() - REVISAO_JANELA_DIAS * 86400000;
  return itens.filter(it => {
    const r = revisoes[it.key];
    return !r || new Date(r.em).getTime() < limite;
  });
}

export function economiaPotencial(itens, revisoes) {
  const cortes = itens.filter(it => revisoes[it.key]?.veredito === "cortar");
  return { total: sum(cortes, it => it.valorMensal), cortes };
}
