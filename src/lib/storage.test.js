import { describe, it, expect, beforeEach } from "vitest";
import { SK, load, save, iniciarArmazenamento } from "./storage.js";

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

beforeEach(() => {
  globalThis.localStorage = memStorage();
  globalThis.sessionStorage = memStorage();
});

describe("modo convidado: dados no aparelho", () => {
  it("sem conta, dados pessoais e preferências ficam no localStorage", () => {
    iniciarArmazenamento();
    save(SK.lancamentos, [1]);
    save(SK.tema, "claro");
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
    expect(localStorage.getItem(SK.tema)).toBe('"claro"');
    expect(load(SK.lancamentos, [])).toEqual([1]);
  });

  it("boot não apaga dados do convidado", () => {
    localStorage.setItem(SK.lancamentos, "[1]");
    iniciarArmazenamento();
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
  });

  it("aba de versão antiga: convidado do sessionStorage vem pro localStorage sem sobrescrever", () => {
    sessionStorage.setItem(SK.lancamentos, "[1]");
    sessionStorage.setItem(SK.onboarded, "true");
    sessionStorage.setItem(SK.metas, "[9]");
    localStorage.setItem(SK.metas, "[2]");
    iniciarArmazenamento();
    expect(localStorage.getItem(SK.lancamentos)).toBe("[1]");
    expect(localStorage.getItem(SK.onboarded)).toBe("true");
    expect(localStorage.getItem(SK.metas)).toBe("[2]");
    expect(sessionStorage.getItem(SK.lancamentos)).toBeNull();
  });
});
