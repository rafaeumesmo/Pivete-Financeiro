import { describe, it, expect } from "vitest";
import { SK } from "./storage.js";
import { mesclarConvidado, resumoTexto, duplicadoTexto } from "./mesclar.js";

// Dados do convidado: o que alguém faria em alguns dias sem conta.
const CONVIDADO = {
  [SK.lancamentos]: [
    { id: "l-a1", descricao: "Mercado", valor: 8750, data: "2026-10-01" },
    { id: "l-a2", descricao: "Uber", valor: 2300, data: "2026-10-02" },
  ],
  [SK.recorrentes]: [{ id: "rec-a1", nome: "Internet", valor: 9990, ativo: true }],
  [SK.contas]: [{ id: "conta-corrente", nome: "Conta corrente", saldo: 50000 }, { id: "conta-a1", nome: "Nubank", saldo: 12000 }],
  [SK.metas]: [{ id: "meta-a1", nome: "Viagem", alvo: 300000, guardado: 5000 }],
  [SK.revisoes]: { "fixo:rec-a1": { veredito: "valeu" } },
  [SK.conquistas]: { "primeiro-lancamento": "2026-10-01" },
  [SK.stats]: { accepted: 3, rejected: 1, shared: 0 },
  [SK.decisions]: [{ id: 2, decidedAt: "2026-10-02T10:00:00Z" }],
  [SK.tema]: "escuro",
  [SK.pixKey]: "convidado@pix",
  [SK.reservaMeses]: 3,
};

// Todo id que o convidado tinha continua no resultado.
function nadaSePerdeu(valores) {
  for (const [k, v] of Object.entries(CONVIDADO)) {
    if (Array.isArray(v)) for (const item of v) expect(valores[k].map((x) => x.id)).toContain(item.id);
    else if (k === SK.revisoes || k === SK.conquistas) for (const chave of Object.keys(v)) expect(valores[k]).toHaveProperty(chave);
  }
}

describe("migração do convidado pra conta", () => {
  it("conta nova: tudo do aparelho sobe, sem mudança", () => {
    const r = mesclarConvidado({ local: CONVIDADO, remoto: {} });
    expect(r.valores).toEqual(CONVIDADO);
    expect(new Set(r.enviar)).toEqual(new Set(Object.keys(CONVIDADO)));
    expect(r.duplicados).toEqual([]);
    expect(r.saldoMantido).toBe(false);
    expect(resumoTexto(r.trazidos)).toBe("Trouxemos 2 lançamentos, 1 fixo, 2 contas e 1 caixinha deste aparelho.");
  });

  it("conta existente com dados: junta pelo id, servidor vence no que é único", () => {
    const remoto = {
      [SK.lancamentos]: [{ id: "l-b1", descricao: "Aluguel", valor: 150000, data: "2026-10-05" }],
      [SK.recorrentes]: [{ id: "rec-b1", nome: " internet ", valor: 9990, ativo: true }, { id: "rec-b2", nome: "Spotify", valor: 2190 }],
      [SK.contas]: [{ id: "conta-corrente", nome: "Conta corrente", saldo: 80000 }, { id: "conta-b1", nome: "nubank", saldo: 3000 }],
      [SK.revisoes]: { "fixo:rec-b2": { veredito: "cortar" } },
      [SK.conquistas]: { "primeiro-lancamento": "2026-09-01", "primeira-paga": "2026-09-02" },
      [SK.stats]: { accepted: 10, rejected: 2, shared: 1 },
      [SK.decisions]: [{ id: 1, decidedAt: "2026-10-03T10:00:00Z" }],
      [SK.tema]: "claro",
      [SK.pixKey]: "",
      [SK.reservaMeses]: 6,
    };
    const r = mesclarConvidado({ local: CONVIDADO, remoto });
    nadaSePerdeu(r.valores);

    expect(r.valores[SK.lancamentos].map((l) => l.id)).toEqual(["l-b1", "l-a1", "l-a2"]);
    // mesma conta (mesmo id) → saldo do servidor; conta só do aparelho entra
    expect(r.valores[SK.contas]).toEqual([...remoto[SK.contas], CONVIDADO[SK.contas][1]]);
    expect(r.saldoMantido).toBe(true); // 500,00 no aparelho, 800,00 na conta
    expect(r.valores[SK.revisoes]).toEqual({ "fixo:rec-a1": { veredito: "valeu" }, "fixo:rec-b2": { veredito: "cortar" } });
    expect(r.valores[SK.conquistas]["primeiro-lancamento"]).toBe("2026-09-01");
    expect(r.valores[SK.stats]).toEqual({ accepted: 13, rejected: 3, shared: 1 });
    expect(r.valores[SK.decisions].map((d) => d.id)).toEqual([1, 2]);
    // único: servidor vence; vazio no servidor fica o do aparelho
    expect(r.valores[SK.tema]).toBe("claro");
    expect(r.valores[SK.reservaMeses]).toBe(6);
    expect(r.valores[SK.pixKey]).toBe("convidado@pix");

    expect(r.enviar).not.toContain(SK.tema);
    expect(r.enviar).toContain(SK.lancamentos);
    expect(r.trazidos).toEqual({ [SK.lancamentos]: 2, [SK.recorrentes]: 1, [SK.contas]: 1, [SK.metas]: 1 });

    // Internet R$ 99,90 e Nubank existem dos dois lados com ids diferentes
    expect(r.duplicados).toEqual([{ tipo: "fixo", nome: "Internet", valor: 9990 }, { tipo: "conta", nome: "Nubank" }]);
    expect(duplicadoTexto(r.duplicados[0])).toMatch(/^Fixo "Internet" de R\$\s?99,90$/);
  });

  it("convidado vazio: fica tudo como está na conta, nada sobe", () => {
    const remoto = { [SK.lancamentos]: [{ id: "l-b1", valor: 100 }], [SK.tema]: "escuro" };
    const r = mesclarConvidado({ local: {}, remoto });
    expect(r.valores).toEqual(remoto);
    expect(r.enviar).toEqual([]);
    expect(r.trazidos).toEqual({});
    expect(resumoTexto(r.trazidos)).toBeNull();
    expect(r.saldoMantido).toBe(false);
  });

  it("aparelho e conta vazios: nada acontece", () => {
    expect(mesclarConvidado({ local: {}, remoto: {} })).toEqual({ valores: {}, enviar: [], trazidos: {}, duplicados: [], saldoMantido: false });
  });

  it("mesma conta com o mesmo saldo nos dois lados: sem aviso", () => {
    const contas = [{ id: "conta-corrente", nome: "Conta corrente", saldo: 100 }];
    expect(mesclarConvidado({ local: { [SK.contas]: contas }, remoto: { [SK.contas]: contas } }).saldoMantido).toBe(false);
  });

  it("mesmo id dos dois lados: vale o do servidor, não duplica", () => {
    const r = mesclarConvidado({
      local: { [SK.lancamentos]: [{ id: "x", valor: 1 }] },
      remoto: { [SK.lancamentos]: [{ id: "x", valor: 2 }] },
    });
    expect(r.valores[SK.lancamentos]).toEqual([{ id: "x", valor: 2 }]);
    expect(r.trazidos).toEqual({});
  });
});
