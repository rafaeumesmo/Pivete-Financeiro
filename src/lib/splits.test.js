import { describe, it, expect } from "vitest";
import { saldosComigo, totaisSaldos, partesIguais } from "./splits.js";

describe("splits", () => {
  const eu = "me", ana = "ana", bia = "bia";
  it("despesa que eu paguei: os outros me devem a parte deles", () => {
    const exps = [{ paid_by: eu, shares: partesIguais(9000, [eu, ana, bia]) }];
    expect(saldosComigo(exps, [], eu)).toEqual({ ana: 3000, bia: 3000 });
  });
  it("despesa que outra pessoa pagou: eu devo minha parte; despesas entre terceiros não me afetam", () => {
    const exps = [
      { paid_by: ana, shares: [{ user_id: ana, amount_cents: 5000 }, { user_id: eu, amount_cents: 5000 }] },
      { paid_by: bia, shares: [{ user_id: bia, amount_cents: 100 }, { user_id: ana, amount_cents: 100 }] },
    ];
    expect(saldosComigo(exps, [], eu)).toEqual({ ana: -5000 });
  });
  it("quitações abatem e o saldo zerado some", () => {
    const exps = [{ paid_by: eu, shares: partesIguais(6000, [eu, ana]) }];
    const sts = [{ from_user: ana, to_user: eu, amount_cents: 3000 }];
    expect(saldosComigo(exps, sts, eu)).toEqual({});
    expect(saldosComigo(exps, [{ from_user: ana, to_user: eu, amount_cents: 1000 }], eu)).toEqual({ ana: 2000 });
  });
  it("totais e partes com resto de centavos", () => {
    expect(totaisSaldos({ a: 3000, b: -1000 })).toEqual({ aReceber: 3000, aPagar: 1000, liquido: 2000 });
    expect(partesIguais(1000, ["a", "b", "c"]).map(p => p.amount_cents)).toEqual([334, 333, 333]);
  });
});
