import { SK } from "./storage.js";
import { materializar } from "./finance.js";
import { addDays, addMonths, fromDateStr, monthKey } from "./dates.js";

// Mês de exemplo do modo sem conta (lib/storage.js, modo "exemplo"). Fica só
// na memória: nada disto vai pro localStorage nem pra conta. Datas relativas
// a `hoje`, valores em centavos. Os fixos e a parcela viram lançamentos pelo
// mesmo materializar do app; o que já venceu sai como pago.

export const CONTA_EXEMPLO = "conta-corrente";
export const COBRANCA_EXEMPLO = "cob-exemplo-aluguel";

export function mesDeExemplo(hoje) {
  const dia = (k) => addDays(hoje, k);
  const diaDoMes = (k) => fromDateStr(dia(k)).getDate();
  const inicio = `${monthKey(addMonths(hoje, -2, 1))}-01`; // dois meses de histórico
  const meioDia = (data) => new Date(`${data}T12:00:00`).toISOString();

  const rec = (id, nome, valor, categoria, tipo, extra) => ({ id: `ex-${id}`, nome, valor, categoria, tipo, frequencia: "mensal", ativo: true, inicio, ...extra });
  const fixos = [
    rec("estagio",   "Estágio",                    120000, "renda",       "entrada", { dia: 5 }),
    rec("aluguel",   "Aluguel",                    135000, "casa",        "saida",   { dia: diaDoMes(-4) }),
    rec("luz",       "Conta de luz",                 6890, "casa",        "saida",   { dia: diaDoMes(2) }),
    rec("streaming", "Streaming (plano básico)",     2090, "assinaturas", "saida",   { dia: diaDoMes(1) }),
    rec("spotify",   "Spotify universitário",        1190, "assinaturas", "saida",   { dia: diaDoMes(-6) }),
    rec("passagem",  "Passagem (recarga semanal)",   3000, "transporte",  "saida",   { frequencia: "semanal", diaSemana: fromDateStr(hoje).getDay() }),
  ];
  // 12× de R$ 89,90 sem juros; 5 pagas antes do histórico + as do histórico.
  const celular = { id: "ex-celular", nome: "Parcela do celular", credor: "Loja", parcela: 8990, jurosMes: 0, diaVencimento: diaDoMes(5), inicio };

  const { novos, recorrentes, dividas } = materializar({ recorrentes: fixos, dividas: [{ ...celular, saldoDevedor: 8990 * 12 }] }, hoje);

  // Avulsos do mês e dos dois anteriores (o gráfico do ano não fica vazio).
  const avulso = (id, descricao, valor, categoria, k, tipo = "saida") => ({ id: `ex-${id}`, descricao, valor, categoria, tipo, data: dia(k), status: "pendente" });
  const avulsos = [0, -30, -60].flatMap((m, i) => [
    avulso(`delivery1-${i}`, "Delivery", 3490, "alimentacao", m - 11),
    avulso(`delivery2-${i}`, "Delivery", 2750, "alimentacao", m - 6),
    avulso(`delivery3-${i}`, "Delivery", 4100, "alimentacao", m - 2),
    avulso(`mercado-${i}`, "Mercado", 8740, "casa", m - 8),
    avulso(`uber-${i}`, "Uber", 1870, "transporte", m - 3),
    avulso(`bico-${i}`, "Pix do bico (montagem de evento)", 18000, "renda", m - 9, "entrada"),
  ]);

  // Já venceu (entrada: até hoje) → pago na conta de exemplo.
  const ultimoAluguel = novos.filter((l) => l.recorrenteId === "ex-aluguel" && l.data < hoje).at(-1);
  const lancamentos = [...novos, ...avulsos].map((l) => {
    const venceu = l.tipo === "entrada" ? l.data <= hoje : l.data < hoje;
    if (!venceu) return l;
    const pago = { ...l, status: "pago", pagoEm: meioDia(l.data), contaId: CONTA_EXEMPLO };
    if (l.dividaId) pago.amortizacao = l.valor;
    if (l.recorrenteId === "ex-aluguel") {
      pago.divisao = { partes: 3, minhaParte: 45000, porPessoa: 45000, aReceber: 90000, cobrancaId: l.id === ultimoAluguel?.id ? COBRANCA_EXEMPLO : `cob-exemplo-${l.data}` };
    }
    return pago;
  });

  const pagasCelular = lancamentos.filter((l) => l.dividaId && l.status === "pago").length;
  const restantes = Math.max(1, 12 - 5 - pagasCelular);
  const dividasEx = dividas.map((d) => ({ ...d, saldoDevedor: 8990 * restantes }));

  // Swipes do histórico: cada pago vira uma decisão; a luz foi adiada um dia
  // antes de pagar; o aluguel foi dividido (pra cima).
  let seq = 1;
  const decisao = (l, direction, label, data) => ({ id: seq++, lancamentoId: l.id, title: l.descricao, valor: l.valor, categoria: l.categoria, direction, label, decidedAt: meioDia(data) });
  const decisions = [];
  for (const l of lancamentos.filter((x) => x.status === "pago").sort((a, b) => (a.data < b.data ? -1 : 1))) {
    if (l.recorrenteId === "ex-luz") decisions.push(decisao(l, "left", "Adiar", addDays(l.data, -1)));
    if (l.recorrenteId === "ex-aluguel") decisions.push(decisao(l, "up", "Dividir", l.data));
    else decisions.push(decisao(l, "right", l.tipo === "entrada" ? "Recebi" : "Paguei", l.data));
  }
  decisions.reverse(); // o app guarda do mais novo pro mais velho

  const delivery = lancamentos.find((l) => l.id === "ex-delivery1-1"); // do mês passado
  const doMesPassado = (k) => meioDia(`${monthKey(addMonths(hoje, -1, 1))}-${String(k).padStart(2, "0")}`);

  return {
    [SK.contas]: [{ id: CONTA_EXEMPLO, nome: "Nubank", saldo: 31240 }],
    [SK.contaPadrao]: CONTA_EXEMPLO,
    [SK.recorrentes]: recorrentes,
    [SK.dividas]: dividasEx,
    [SK.lancamentos]: lancamentos,
    [SK.metas]: [{ id: "ex-viagem", nome: "Viagem de fim de ano", alvo: 80000, guardado: 16000 }],
    [SK.cobrancas]: ultimoAluguel ? [{
      id: COBRANCA_EXEMPLO, lancamentoId: ultimoAluguel.id, titulo: "Aluguel", total: 135000, porPessoa: 45000, partes: 3, aReceber: 90000,
      criadaEm: meioDia(ultimoAluguel.data), arquivada: false,
      recebidos: [{ id: "ex-rec-lucas", nome: "Lucas", valor: 45000, contaId: CONTA_EXEMPLO, em: meioDia(ultimoAluguel.data) }],
    }] : [],
    [SK.decisions]: decisions,
    [SK.revisoes]: {
      "rec:ex-spotify": { veredito: "valeu", em: doMesPassado(12) },
      ...(delivery ? { [`lan:${delivery.id}`]: { veredito: "cortar", em: doMesPassado(14) } } : {}),
    },
    [SK.conquistas]: { "primeiro-lancamento": doMesPassado(2), "primeira-paga": doMesPassado(3), "primeira-caixinha": doMesPassado(10) },
    [SK.stats]: {
      accepted: decisions.filter((d) => d.direction === "right").length,
      rejected: decisions.filter((d) => d.direction === "left").length,
      shared: decisions.filter((d) => d.direction === "up").length,
    },
    [SK.streak]: { count: 4, best: 9, lastActiveDate: dia(-1), freezesAvailable: 1 },
    [SK.onboarded]: true,
  };
}
