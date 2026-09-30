import { describe, it, expect } from "vitest";
import { telaInicial } from "./landing.js";

describe("regra de exibição da Landing", () => {
  it("sem sessão e sem ter começado nesta aba → Landing", () => {
    expect(telaInicial({ session: null, jaNoApp: false })).toBe("landing");
  });

  it("logado no aparelho ou já no app nesta aba → app, sem esperar a sessão", () => {
    expect(telaInicial({ session: undefined, jaNoApp: true })).toBe("app");
    expect(telaInicial({ session: null, jaNoApp: true })).toBe("app");
  });

  it("com sessão → app; sessão carregando → nada (sem flash)", () => {
    expect(telaInicial({ session: { user: { id: "a" } }, jaNoApp: false })).toBe("app");
    expect(telaInicial({ session: undefined, jaNoApp: false })).toBe("carregando");
  });

  it("saiu da conta → Landing mesmo já tendo usado o app; logou de novo → app", () => {
    expect(telaInicial({ session: null, jaNoApp: true, saiu: true })).toBe("landing");
    expect(telaInicial({ session: undefined, jaNoApp: true, saiu: true })).toBe("carregando");
    expect(telaInicial({ session: { user: { id: "a" } }, jaNoApp: true, saiu: true })).toBe("app");
  });
});
