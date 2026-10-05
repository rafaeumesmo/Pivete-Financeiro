import { describe, it, expect } from "vitest";
import { mesDeExemplo, COBRANCA_EXEMPLO } from "./exemplo.js";
import { SK } from "./storage.js";
import { deckLancamentos, materializar, mergeNovos } from "./finance.js";
import { estatisticasMes, reciboDoMes } from "./recibo.js";

// Datas que costumam quebrar: começo, fim de mês, fevereiro, virada de ano.
const DATAS = ["2026-10-05", "2026-10-01", "2026-10-30", "2027-02-28", "2027-01-02"];

describe("mês de exemplo", () => {
  for (const hoje of DATAS) {
    describe(hoje, () => {
      const ex = mesDeExemplo(hoje);
      const lanc = ex[SK.lancamentos];

      it("só usa chaves conhecidas e valores em centavos inteiros", () => {
        const chaves = new Set(Object.values(SK));
        for (const k of Object.keys(ex)) expect(chaves.has(k)).toBe(true);
        for (const l of lanc) expect(Number.isInteger(l.valor) && l.valor > 0).toBe(true);
        expect(Number.isInteger(ex[SK.contas][0].saldo)).toBe(true);
      });

      it("nada pago no futuro; ids únicos", () => {
        for (const l of lanc) if (l.status === "pago") expect(l.data <= hoje).toBe(true);
        expect(new Set(lanc.map((l) => l.id)).size).toBe(lanc.length);
      });

      it("o app não gera duplicata ao rodar o materializar por cima", () => {
        const { novos } = materializar({ recorrentes: ex[SK.recorrentes], dividas: ex[SK.dividas] }, hoje);
        expect(mergeNovos(lanc, novos).length).toBe(lanc.length);
      });

      it("deck tem luz, streaming e passagem esperando", () => {
        const deck = deckLancamentos(lanc, new Date(`${hoje}T12:00:00`)).map((l) => l.recorrenteId);
        expect(deck).toEqual(expect.arrayContaining(["ex-luz", "ex-streaming", "ex-passagem"]));
      });

      it("aluguel dividido com cobrança aberta (Lucas já pagou)", () => {
        const c = ex[SK.cobrancas][0];
        expect(c.id).toBe(COBRANCA_EXEMPLO);
        const aluguel = lanc.find((l) => l.id === c.lancamentoId);
        expect(aluguel.status).toBe("pago");
        expect(aluguel.divisao).toMatchObject({ partes: 3, minhaParte: 45000, aReceber: 90000, cobrancaId: COBRANCA_EXEMPLO });
        expect(c.recebidos.map((r) => r.nome)).toEqual(["Lucas"]);
      });

      it("o mês passado rende um recibo de exemplo", () => {
        const s = estatisticasMes({
          decisions: ex[SK.decisions], revisoes: ex[SK.revisoes], conquistas: ex[SK.conquistas], categorias: [], ym: reciboDoMes(hoje).ym,
        });
        expect(s.suficiente).toBe(true);
        expect(s.adiadas).toBeGreaterThanOrEqual(1);
      });
    });
  }
});
