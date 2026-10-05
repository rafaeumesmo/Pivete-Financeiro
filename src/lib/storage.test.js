import { describe, it, expect, beforeEach } from "vitest";
import { SK, load, save, iniciarArmazenamento, modoArmazenamento, entrarNoExemplo, aoEntrarNaConta } from "./storage.js";

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

beforeEach(() => {
  globalThis.localStorage = memStorage();
  globalThis.sessionStorage = memStorage();
});

const exemplo = () => ({ [SK.lancamentos]: [{ id: "ex-1" }], [SK.onboarded]: true });

describe("modos de armazenamento", () => {
  it("sem sessão e sem dados: modo exemplo, só na memória", () => {
    expect(iniciarArmazenamento({ exemplo })).toBe("exemplo");
    expect(load(SK.lancamentos, [])).toEqual([{ id: "ex-1" }]);
    save(SK.lancamentos, [{ id: "meu" }]);
    expect(load(SK.lancamentos, [])).toEqual([{ id: "meu" }]);
    expect(localStorage.getItem(SK.lancamentos)).toBeNull();
    expect(localStorage.getItem(SK.onboarded)).toBeNull();
  });

  it("exemplo: preferências do aparelho continuam no localStorage", () => {
    iniciarArmazenamento({ exemplo });
    save(SK.tema, "escuro");
    save(SK.landingSeen, true);
    expect(localStorage.getItem(SK.tema)).toBe('"escuro"');
    expect(localStorage.getItem(SK.landingSeen)).toBe("true");
  });

  it("recarregar (boot de novo) volta o exemplo ao início", () => {
    iniciarArmazenamento({ exemplo });
    save(SK.lancamentos, []);
    iniciarArmazenamento({ exemplo });
    expect(load(SK.lancamentos, null)).toEqual([{ id: "ex-1" }]);
    entrarNoExemplo();
    expect(load(SK.lancamentos, null)).toEqual([{ id: "ex-1" }]);
  });

  it("dados reais no aparelho sem sessão: legado, no localStorage, nada vira exemplo", () => {
    localStorage.setItem(SK.lancamentos, '[{"id":"real"}]');
    expect(iniciarArmazenamento({ exemplo })).toBe("legado");
    expect(load(SK.lancamentos, [])).toEqual([{ id: "real" }]);
    save(SK.metas, [1]);
    expect(localStorage.getItem(SK.metas)).toBe("[1]");
  });

  it("chave vazia ([], {}) não conta como dado real", () => {
    localStorage.setItem(SK.lancamentos, "[]");
    localStorage.setItem(SK.revisoes, "{}");
    expect(iniciarArmazenamento({ exemplo })).toBe("exemplo");
  });

  it("com sessão: conta", () => {
    expect(iniciarArmazenamento({ temSessao: true, exemplo })).toBe("conta");
    save(SK.lancamentos, [1]);
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
  });

  it("login no exemplo pede recarga (nada do exemplo segue); no legado vira conta", () => {
    iniciarArmazenamento({ exemplo });
    expect(aoEntrarNaConta()).toBe(true);
    localStorage.setItem(SK.lancamentos, '[{"id":"real"}]');
    iniciarArmazenamento({ exemplo });
    expect(aoEntrarNaConta()).toBe(false);
    expect(modoArmazenamento()).toBe("conta");
  });

  it("aba de versão antiga: convidado do sessionStorage vem pro localStorage e vira legado", () => {
    sessionStorage.setItem(SK.lancamentos, "[1]");
    sessionStorage.setItem(SK.metas, "[9]");
    localStorage.setItem(SK.metas, "[2]");
    expect(iniciarArmazenamento({ exemplo })).toBe("legado");
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
    expect(localStorage.getItem(SK.metas)).toBe("[2]");
    expect(sessionStorage.getItem(SK.lancamentos)).toBeNull();
  });
});
