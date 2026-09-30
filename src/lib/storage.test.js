import { describe, it, expect, beforeEach } from "vitest";
import { SK, load, save, iniciarArmazenamento, tornarPersistente, tornarTemporario } from "./storage.js";

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

beforeEach(() => {
  globalThis.localStorage = memStorage();
  globalThis.sessionStorage = memStorage();
});

describe("dados sem login só vivem na aba", () => {
  it("sem login: dados pessoais vão pro sessionStorage, preferências pro localStorage", () => {
    iniciarArmazenamento({ logado: false });
    save(SK.lancamentos, [1]);
    save(SK.tema, "claro");
    expect(sessionStorage.getItem(SK.lancamentos)).toBe("[1]");
    expect(localStorage.getItem(SK.lancamentos)).toBeNull();
    expect(localStorage.getItem(SK.tema)).toBe('"claro"');
    expect(load(SK.lancamentos, [])).toEqual([1]);
  });

  it("boot sem login apaga dados antigos do localStorage, menos os de uma conta", () => {
    localStorage.setItem(SK.lancamentos, "[1]");
    localStorage.setItem(SK.tema, '"claro"');
    iniciarArmazenamento({ logado: false });
    expect(localStorage.getItem(SK.lancamentos)).toBeNull();
    expect(localStorage.getItem(SK.tema)).toBe('"claro"');

    localStorage.setItem(SK.lancamentos, "[2]");
    localStorage.setItem(SK.syncOwner, '"u1"');
    iniciarArmazenamento({ logado: false });
    expect(localStorage.getItem(SK.lancamentos)).toBe("[2]");
  });

  it("login leva o que foi feito na aba pro localStorage; logout volta pra aba", () => {
    iniciarArmazenamento({ logado: false });
    save(SK.lancamentos, [1]);
    tornarPersistente();
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
    expect(sessionStorage.getItem(SK.lancamentos)).toBeNull();
    save(SK.metas, [9]);
    expect(localStorage.getItem(SK.metas)).toBe("[9]");
    tornarTemporario();
    save(SK.metas, [7]);
    expect(sessionStorage.getItem(SK.metas)).toBe("[7]");
  });

  it("logado: tudo no localStorage", () => {
    iniciarArmazenamento({ logado: true });
    save(SK.lancamentos, [1]);
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
  });
});
