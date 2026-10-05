import { describe, it, expect } from "vitest";
import { precisaConta } from "./acesso.js";

describe("o que pede conta", () => {
  it("modo exemplo: adicionar, editar saldo e mandar cobrança", () => {
    for (const a of ["adicionar", "editarSaldo", "enviarCobranca"]) expect(precisaConta("exemplo", a)).toBe(true);
  });
  it("legado: só adicionar dado novo; o que já tem segue livre", () => {
    expect(precisaConta("legado", "adicionar")).toBe(true);
    expect(precisaConta("legado", "editarSaldo")).toBe(false);
    expect(precisaConta("legado", "enviarCobranca")).toBe(false);
  });
  it("conta: nada pede", () => {
    for (const a of ["adicionar", "editarSaldo", "enviarCobranca"]) expect(precisaConta("conta", a)).toBe(false);
  });
  it("ação desconhecida (ex.: criar Bora?) nunca pede", () => {
    expect(precisaConta("exemplo", "criarBora")).toBe(false);
  });
});
