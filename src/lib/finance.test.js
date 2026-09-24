import { describe, it, expect } from "vitest";
import { formatBRL, parseBRL, splitCents } from "./money.js";
import { addMonths, dateInMonth, todayKey } from "./dates.js";
import {
  deckLancamentos, vencimentoInfo, gerarParcelamento, ocorrencias, valorMensal,
  materializar, aplicarPagamento, parcelasRestantes, resumoMes, patrimonio,
  projecao12m, itensRevisao, revisaoPendente, economiaPotencial, comprometimento,
} from "./finance.js";

describe("money", () => {
  it("formata em BRL com milhar e centavos", () => {
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
    expect(formatBRL(5)).toBe("R$ 0,05");
    expect(formatBRL(-2000)).toBe("-R$ 20,00");
  });
  it("interpreta entradas em formato brasileiro e com ponto decimal", () => {
    expect(parseBRL("1.234,56")).toBe(123456);
    expect(parseBRL("R$ 12")).toBe(1200);
    expect(parseBRL("12,5")).toBe(1250);
    expect(parseBRL("1234.56")).toBe(123456);
    expect(parseBRL("1.234")).toBe(123400);
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("")).toBeNull();
  });
  it("divide centavos sem perder nada", () => {
    expect(splitCents(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitCents(10000, 3).reduce((a, b) => a + b)).toBe(10000);
  });
});

describe("dates", () => {
  it("limita o dia ao fim do mês", () => {
    expect(dateInMonth(2025, 1, 31)).toBe("2025-02-28");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2025-01-31", 2)).toBe("2025-03-31");
    expect(addMonths("2025-11-10", 3)).toBe("2026-02-10");
  });
  it("todayKey usa o fuso local, não UTC", () => {
    expect(todayKey(new Date(2025, 5, 10, 23, 30))).toBe("2025-06-10");
  });
});

describe("deck", () => {
  const now = new Date(2025, 5, 10, 12);
  const L = (id, data, extra = {}) => ({ id, tipo: "saida", valor: 1000, categoria: "outros", descricao: id, data, status: "pendente", ...extra });
  it("mostra vencidos e os próximos 7 dias, mais urgente no topo (fim)", () => {
    const deck = deckLancamentos([
      L("futuro", "2025-06-18"), L("limite", "2025-06-17"), L("hoje", "2025-06-10"),
      L("vencido", "2025-06-01"), L("pago", "2025-06-10", { status: "pago" }), L("semdata", null),
    ], now);
    expect(deck.map(l => l.id)).toEqual(["limite", "hoje", "vencido"]);
  });
  it("adiado volta pro deck quando o prazo passa", () => {
    const deck = deckLancamentos([
      L("a", "2025-06-10", { status: "adiado", adiadoAte: new Date(2025, 5, 10, 11).toISOString() }),
      L("b", "2025-06-10", { status: "adiado", adiadoAte: new Date(2025, 5, 11).toISOString() }),
    ], now);
    expect(deck.map(l => l.id)).toEqual(["a"]);
  });
  it("rotula o vencimento", () => {
    expect(vencimentoInfo("2025-06-10", "2025-06-10").label).toBe("Vence hoje");
    expect(vencimentoInfo("2025-06-13", "2025-06-10").label).toBe("Vence em 3 dias");
    expect(vencimentoInfo("2025-06-07", "2025-06-10")).toMatchObject({ label: "Venceu há 3 dias", atrasado: true });
  });
});

describe("parcelamento", () => {
  it("gera N parcelas mensais que somam o total", () => {
    const ps = gerarParcelamento({ valorTotal: 100000, parcelas: 3, data: "2025-01-31", descricao: "TV", tipo: "saida", categoria: "casa" });
    expect(ps.map(p => p.valor)).toEqual([33334, 33333, 33333]);
    expect(ps.map(p => p.data)).toEqual(["2025-01-31", "2025-02-28", "2025-03-31"]);
    expect(ps[1].descricao).toBe("TV (2/3)");
    expect(new Set(ps.map(p => p.parcela.grupoId)).size).toBe(1);
  });
});

describe("recorrentes", () => {
  it("mensal cai no dia certo, inclusive em meses curtos", () => {
    expect(ocorrencias({ frequencia: "mensal", dia: 31 }, "2025-01-15", "2025-03-10")).toEqual(["2025-01-31", "2025-02-28"]);
  });
  it("semanal cai no dia da semana", () => {
    // 2025-06-10 é terça (2)
    expect(ocorrencias({ frequencia: "semanal", diaSemana: 5 }, "2025-06-10", "2025-06-24")).toEqual(["2025-06-13", "2025-06-20"]);
  });
  it("valor mensal de semanal = 52/12 semanas", () => {
    expect(valorMensal({ frequencia: "semanal", valor: 1200 })).toBe(5200);
  });
  it("materializa uma vez só e não recria o que já foi gerado", () => {
    const rec = { id: "r1", nome: "Internet", valor: 4000, categoria: "casa", tipo: "saida", frequencia: "mensal", dia: 15, ativo: true, inicio: "2025-06-01" };
    const r1 = materializar({ recorrentes: [rec], dividas: [] }, "2025-06-10");
    expect(r1.novos.map(l => l.data)).toEqual(["2025-06-15"]);
    expect(r1.recorrentes[0].geradoAte).toBe("2025-06-30");
    const r2 = materializar({ recorrentes: r1.recorrentes, dividas: [] }, "2025-06-20");
    expect(r2.novos).toEqual([]);
    const r3 = materializar({ recorrentes: r1.recorrentes, dividas: [] }, "2025-07-01");
    expect(r3.novos.map(l => l.data)).toEqual(["2025-07-15"]);
  });
  it("gera parcela de dívida só enquanto há saldo", () => {
    const d = { id: "d1", nome: "Cartão", credor: "Banco", saldoDevedor: 50000, parcela: 10000, jurosMes: 2, diaVencimento: 20, inicio: "2025-06-01" };
    const r = materializar({ recorrentes: [], dividas: [d, { ...d, id: "d2", saldoDevedor: 0 }] }, "2025-06-10");
    expect(r.novos).toHaveLength(1);
    expect(r.novos[0]).toMatchObject({ dividaId: "d1", valor: 10000, data: "2025-06-20", categoria: "dividas" });
  });
});

describe("dívidas", () => {
  it("paga juros primeiro e amortiza o resto", () => {
    expect(aplicarPagamento({ saldoDevedor: 100000, jurosMes: 5 }, 20000)).toEqual({ juros: 5000, amortizacao: 15000, saldoDevedor: 85000 });
  });
  it("estima parcelas restantes (Price)", () => {
    expect(parcelasRestantes({ saldoDevedor: 100000, parcela: 10000, jurosMes: 0 })).toBe(10);
    // 1000 a 5% a.m. com parcela de 100 → 14,2 → 15 parcelas
    expect(parcelasRestantes({ saldoDevedor: 100000, parcela: 10000, jurosMes: 5 })).toBe(15);
    expect(parcelasRestantes({ saldoDevedor: 100000, parcela: 5000, jurosMes: 5 })).toBe(Infinity);
    expect(parcelasRestantes({ saldoDevedor: 0, parcela: 5000, jurosMes: 5 })).toBe(0);
  });
});

describe("resumos", () => {
  const ls = [
    { id: "1", tipo: "entrada", valor: 250000, categoria: "renda", data: "2025-06-05", status: "pago" },
    { id: "2", tipo: "saida", valor: 45000, categoria: "transporte", data: "2025-06-05", status: "pago" },
    { id: "3", tipo: "saida", valor: 10000, categoria: "lazer", data: "2025-06-20", status: "pendente", divisao: { partes: 2, minhaParte: 5000 } },
    { id: "4", tipo: "saida", valor: 99999, categoria: "lazer", data: "2025-07-01", status: "pendente" },
  ];
  it("resume o mês contando só a minha parte de contas divididas", () => {
    const r = resumoMes(ls, "2025-06");
    expect(r).toMatchObject({ entradas: 250000, saidas: 50000, sobra: 200000, saidasPagas: 45000, saidasPendentes: 5000 });
    expect(r.porCategoria).toEqual({ transporte: 45000, lazer: 5000 });
  });
  it("patrimônio = contas + caixinhas − dívidas", () => {
    expect(patrimonio({ contas: [{ saldo: 1000 }], metas: [{ guardado: 500 }], dividas: [{ saldoDevedor: 300 }] })).toEqual({ tenho: 1500, devo: 300, liquido: 1200, caixa: 1500 });
  });
  it("patrimônio: conta no vermelho vai pro devo, tenho nunca fica negativo", () => {
    const p = patrimonio({ contas: [{ saldo: 1000 }, { saldo: -400 }], metas: [], dividas: [{ saldoDevedor: 300 }] });
    expect(p).toEqual({ tenho: 1000, devo: 700, liquido: 300, caixa: 600 });
    expect(patrimonio({ contas: [{ saldo: -200 }], metas: [], dividas: [] }).tenho).toBe(0);
  });
  it("comprometimento = (fixos + parcelas) / renda", () => {
    const recorrentes = [{ ativo: true, tipo: "saida", valor: 50000, frequencia: "mensal" }];
    expect(comprometimento({ recorrentes, dividas: [{ saldoDevedor: 1, parcela: 50000 }], renda: 200000 })).toBe(0.5);
    expect(comprometimento({ recorrentes, dividas: [], renda: 0 })).toBeNull();
  });
  it("projeção: dívida cai e a parcela liberada vira sobra", () => {
    const p = projecao12m({ tenho: 0, dividas: [{ saldoDevedor: 20000, parcela: 10000, jurosMes: 0 }], renda: 100000, fixos: 50000 });
    expect(p).toHaveLength(13);
    expect(p[1]).toEqual({ mes: 1, tenho: 40000, divida: 10000 });
    expect(p[2]).toEqual({ mes: 2, tenho: 80000, divida: 0 });
    expect(p[3]).toEqual({ mes: 3, tenho: 130000, divida: 0 });
  });
});

describe("revisar gastos", () => {
  const recorrentes = [{ id: "r1", nome: "Spotify", valor: 2000, categoria: "assinaturas", tipo: "saida", frequencia: "mensal", ativo: true }];
  const lancamentos = [
    { id: "a", tipo: "saida", valor: 3000, categoria: "lazer", descricao: "Cinema", data: "2025-06-05", status: "pago" },
    { id: "b", tipo: "saida", valor: 2000, categoria: "assinaturas", descricao: "Spotify", data: "2025-06-05", status: "pago", recorrenteId: "r1" },
    { id: "c", tipo: "saida", valor: 9000, categoria: "lazer", descricao: "Antigo", data: "2025-04-01", status: "pago" },
  ];
  it("lista fixos + avulsos pagos dos últimos 30 dias, sem duplicar o fixo", () => {
    const itens = itensRevisao({ recorrentes, lancamentos }, "2025-06-10");
    expect(itens.map(i => i.key)).toEqual(["rec:r1", "lan:a"]);
  });
  it("soma a economia dos itens marcados pra cortar e esconde os já revisados", () => {
    const itens = itensRevisao({ recorrentes, lancamentos }, "2025-06-10");
    const revisoes = { "rec:r1": { veredito: "cortar", em: new Date(2025, 5, 9).toISOString() } };
    expect(economiaPotencial(itens, revisoes).total).toBe(2000);
    expect(revisaoPendente(itens, revisoes, new Date(2025, 5, 10)).map(i => i.key)).toEqual(["lan:a"]);
  });
});
