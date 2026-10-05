import { describe, it, expect } from "vitest";
import { somenteUltima } from "./ultima.js";

const depois = (ms, valor) => () => new Promise((r) => setTimeout(() => r(valor), ms));

describe("somenteUltima", () => {
  it("resposta velha que chega por último não sobrescreve a nova", async () => {
    // Bora escolha única: a leitura disparada pelo delete (sem o voto) sai
    // antes e responde depois da releitura que já tem o voto.
    const rodar = somenteUltima();
    const aplicados = [];
    await Promise.all([
      rodar(depois(30, "sem o voto"), (v) => aplicados.push(v)),
      rodar(depois(5, "com o voto"), (v) => aplicados.push(v)),
    ]);
    expect(aplicados).toEqual(["com o voto"]);
  });

  it("chamadas em sequência aplicam todas", async () => {
    const rodar = somenteUltima();
    const aplicados = [];
    await rodar(depois(1, 1), (v) => aplicados.push(v));
    await rodar(depois(1, 2), (v) => aplicados.push(v));
    expect(aplicados).toEqual([1, 2]);
  });
});
