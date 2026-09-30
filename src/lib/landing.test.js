import { describe, it, expect } from "vitest";
import { telaInicial, temDadosLocais } from "./landing.js";

function fakeStorage(obj) {
  const keys = Object.keys(obj);
  return { length: keys.length, key: (i) => keys[i] ?? null };
}

describe("regra de exibição da Landing", () => {
  it("sem sessão e sem dados locais → Landing", () => {
    const temDados = temDadosLocais(fakeStorage({ tm_anon_id: "x" }));
    expect(temDados).toBe(false);
    expect(telaInicial({ session: null, temDados })).toBe("landing");
  });

  it("com dados locais → app, mesmo sem sessão ou com ela carregando", () => {
    const temDados = temDadosLocais(fakeStorage({ fin_lancamentos: "[]" }));
    expect(temDados).toBe(true);
    expect(telaInicial({ session: null, temDados })).toBe("app");
    expect(telaInicial({ session: undefined, temDados })).toBe("app");
  });

  it("com sessão → app; sessão carregando → nada (sem flash)", () => {
    expect(telaInicial({ session: { user: { id: "a" } }, temDados: false })).toBe("app");
    expect(telaInicial({ session: undefined, temDados: false })).toBe("carregando");
  });

  it("saiu da conta → Landing mesmo com dados locais; logou de novo → app", () => {
    expect(telaInicial({ session: null, temDados: true, saiu: true })).toBe("landing");
    expect(telaInicial({ session: undefined, temDados: true, saiu: true })).toBe("carregando");
    expect(telaInicial({ session: { user: { id: "a" } }, temDados: true, saiu: true })).toBe("app");
  });

  it("storage que lança erro conta como vazio", () => {
    const quebrado = { get length() { throw new Error("blocked"); } };
    expect(temDadosLocais(quebrado)).toBe(false);
  });
});
