import { describe, it, expect } from "vitest";
import { registrarDiaUso, deveAvisarConta } from "./convidado.js";

describe("aviso de criar conta pro convidado", () => {
  it("conta dias distintos, sem repetir", () => {
    let d = registrarDiaUso([], "2026-10-01");
    d = registrarDiaUso(d, "2026-10-01");
    d = registrarDiaUso(d, "2026-10-04");
    expect(d).toEqual(["2026-10-01", "2026-10-04"]);
  });

  it("aparece no 3º dia de uso, não antes", () => {
    const hoje = "2026-10-09";
    expect(deveAvisarConta({ logado: false, diasUso: ["2026-10-01", "2026-10-05"], hoje })).toBe(false);
    expect(deveAvisarConta({ logado: false, diasUso: ["2026-10-01", "2026-10-05", hoje], hoje })).toBe(true);
  });

  it("nunca pra quem tem conta", () => {
    expect(deveAvisarConta({ logado: true, diasUso: ["a", "b", "c"], hoje: "2026-10-09" })).toBe(false);
  });

  it("fechado: some por uma semana e volta", () => {
    const diasUso = ["2026-10-01", "2026-10-02", "2026-10-03"];
    expect(deveAvisarConta({ logado: false, diasUso, dispensadoEm: "2026-10-03", hoje: "2026-10-09" })).toBe(false);
    expect(deveAvisarConta({ logado: false, diasUso, dispensadoEm: "2026-10-03", hoje: "2026-10-10" })).toBe(true);
  });
});
