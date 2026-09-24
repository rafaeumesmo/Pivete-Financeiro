import { describe, it, expect } from "vitest";
import { taxaEmDia, avaliarConquistas, xpTotal, nivel, custoMensal } from "./conquistas.js";

const base = { lancamentos: [], dividas: [], metas: [], revisoes: {}, streak: { best: 0 }, recorrentes: [], reservaMeses: 6, hoje: "2025-06-10" };

describe("conquistas", () => {
  it("taxa em dia compara a data do pagamento (local) com o vencimento", () => {
    const ls = [
      { tipo: "saida", status: "pago", data: "2025-06-10", pagoEm: new Date(2025, 5, 10, 22).toISOString() },
      { tipo: "saida", status: "pago", data: "2025-06-10", pagoEm: new Date(2025, 5, 12, 9).toISOString() },
      { tipo: "saida", status: "pendente", data: "2025-06-10" },
    ];
    expect(taxaEmDia(ls)).toEqual({ emDia: 1, total: 2, pct: 0.5 });
    expect(taxaEmDia([])).toBeNull();
  });

  it("custo mensal soma fixos e parcelas", () => {
    const ctx = { ...base, recorrentes: [{ ativo: true, tipo: "saida", valor: 1000, frequencia: "mensal" }], dividas: [{ saldoDevedor: 5, parcela: 500 }] };
    expect(custoMensal(ctx, ctx.hoje)).toBe(1500);
  });

  it("desbloqueia reserva de 1 mês e dívida quitada", () => {
    const ctx = {
      ...base,
      recorrentes: [{ ativo: true, tipo: "saida", valor: 1000, frequencia: "mensal" }],
      metas: [{ alvo: 5000, guardado: 1200 }],
      dividas: [{ saldoDevedor: 0, parcela: 100, quitadaEm: "2025-06-01T00:00:00Z" }],
    };
    const ids = avaliarConquistas(ctx);
    expect(ids).toContain("reserva-1");
    expect(ids).toContain("divida-quitada");
    expect(ids).toContain("primeira-caixinha");
    expect(ids).not.toContain("reserva-completa");
    expect(ids).not.toContain("meta-batida");
  });

  it("XP = decisões + bônus das conquistas; 500 XP por nível", () => {
    expect(xpTotal(3, { "primeira-paga": "x", "divida-quitada": "y" })).toBe(30 + 50 + 500);
    expect(nivel(1230)).toEqual({ nivel: 3, noNivel: 230, porNivel: 500 });
  });
});
