import { describe, it, expect } from "vitest";
import { planSync } from "./syncPlan.js";

describe("planSync", () => {
  it("primeiro login: sobe o que só existe no aparelho", () => {
    const p = planSync({ uid: "a", owner: null, localKeys: ["fin_dividas", "fin_metas"], remoteKeys: [], dirtyKeys: [] });
    expect(p).toEqual({ wipeLocal: false, apply: [], push: ["fin_dividas", "fin_metas"] });
  });

  it("navegador novo: o servidor vence nas chaves que ele tem", () => {
    const p = planSync({ uid: "a", owner: null, localKeys: ["fin_dividas"], remoteKeys: ["fin_dividas", "fin_recorrentes"], dirtyKeys: [] });
    expect(p.apply).toEqual(["fin_dividas", "fin_recorrentes"]);
    expect(p.push).toEqual([]);
  });

  it("edição local ainda não enviada não é sobrescrita e sobe", () => {
    const p = planSync({ uid: "a", owner: "a", localKeys: ["fin_dividas"], remoteKeys: ["fin_dividas", "fin_metas"], dirtyKeys: ["fin_dividas"] });
    expect(p.apply).toEqual(["fin_metas"]);
    expect(p.push).toEqual(["fin_dividas"]);
  });

  it("dados de outra conta no navegador: descarta o local e não envia nada", () => {
    const p = planSync({ uid: "b", owner: "a", localKeys: ["fin_dividas"], remoteKeys: ["fin_metas"], dirtyKeys: ["fin_dividas"] });
    expect(p).toEqual({ wipeLocal: true, apply: ["fin_metas"], push: [] });
  });
});
