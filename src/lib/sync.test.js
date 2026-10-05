import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Supabase falso: tabela user_data em memória, por usuário.
const servidor = new Map(); // `${uid}:${key}` → value
const envios = [];          // cada linha que chegou no upsert
let falharEnvio = false;
vi.mock("../supabaseClient", () => ({
  supabase: {
    from: () => ({
      upsert: async (rows) => {
        if (falharEnvio) return { error: { message: "offline" } };
        rows.forEach((r) => { envios.push(r); servidor.set(`${r.user_id}:${r.key}`, r.value); });
        return { error: null };
      },
      select: () => ({
        eq: async (_col, uid) => ({
          data: [...servidor].filter(([k]) => k.startsWith(`${uid}:`)).map(([k, value]) => ({ key: k.slice(uid.length + 1), value })),
          error: null,
        }),
      }),
    }),
  },
}));

const { SK, save, load, iniciarArmazenamento } = await import("./storage.js");
const { mesDeExemplo } = await import("./exemplo.js");
const { startSync, stopSync, limparAparelho } = await import("./sync.js");

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

const CONTA = {
  [SK.lancamentos]: [{ id: "l1", descricao: "Aluguel", valor: 150000 }],
  [SK.contas]: [{ id: "conta-corrente", nome: "Conta corrente", saldo: 80000 }],
  [SK.metas]: [{ id: "m1", nome: "Viagem", guardado: 1000 }],
};

let uid = 0;
async function entrar() {
  const id = `u${++uid}`;
  Object.entries(CONTA).forEach(([k, v]) => servidor.set(`${id}:${k}`, v));
  localStorage.setItem(SK.syncOwner, JSON.stringify(id)); // aparelho já é desta conta
  await startSync(id);
  return id;
}

beforeEach(() => {
  globalThis.localStorage = memStorage();
  globalThis.sessionStorage = memStorage();
  globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: "visible" };
  servidor.clear();
  envios.length = 0;
  falharEnvio = false;
});
afterEach(() => stopSync());

describe("limpar dados deste aparelho com conta", () => {
  it("não manda vazio pra conta e deixa o aparelho igual à conta", async () => {
    const id = await entrar();
    save(SK.lancamentos, [...CONTA[SK.lancamentos], { id: "l2", descricao: "Lixo local", valor: 1 }]);
    servidor.set(`${id}:${SK.lancamentos}`, CONTA[SK.lancamentos]); // o envio agendado ainda não saiu
    envios.length = 0;

    expect(await limparAparelho()).toBe(true);

    // O pendente sobe antes (não se perde); nenhum envio é vazio.
    expect(envios.map((r) => r.key)).toEqual([SK.lancamentos]);
    expect(envios.every((r) => Array.isArray(r.value) ? r.value.length > 0 : r.value != null)).toBe(true);
    // Aparelho = conta.
    expect(load(SK.lancamentos, null)).toEqual(servidor.get(`${id}:${SK.lancamentos}`));
    expect(load(SK.contas, null)).toEqual(CONTA[SK.contas]);
    expect(load(SK.metas, null)).toEqual(CONTA[SK.metas]);
    // Dono continua: o próximo login não vira junção de convidado.
    expect(load(SK.syncOwner, null)).toBe(id);
  });

  it("a conta fica intacta: nada é apagado no servidor", async () => {
    const id = await entrar();
    const antes = JSON.stringify([...servidor]);
    expect(await limparAparelho()).toBe(true);
    expect(JSON.stringify([...servidor])).toBe(antes);
    expect(load(SK.lancamentos, null)).toEqual(CONTA[SK.lancamentos]);
    expect(id).toBeTruthy();
  });

  it("sem conseguir enviar o pendente, não apaga nada", async () => {
    await entrar();
    save(SK.metas, [{ id: "m2", nome: "Feito offline", guardado: 5 }]);
    falharEnvio = true;
    expect(await limparAparelho()).toBe(false);
    expect(load(SK.metas, null)).toEqual([{ id: "m2", nome: "Feito offline", guardado: 5 }]);
  });

  it("sem conta (convidado), não faz nada pela sync", async () => {
    expect(await limparAparelho()).toBe(false);
    expect(envios).toEqual([]);
  });
});

describe("mês de exemplo nunca sobe pra conta", () => {
  it("mexe no exemplo, entra (recarrega com sessão) e a sync não envia nada dele", async () => {
    iniciarArmazenamento({ exemplo: () => mesDeExemplo("2026-10-05") });
    save(SK.lancamentos, [...load(SK.lancamentos, []), { id: "feito-no-exemplo", valor: 1 }]);
    save(SK.metas, [{ id: "caixinha-no-exemplo" }]);
    expect(localStorage.getItem(SK.lancamentos)).toBeNull();

    // Login recarrega a página: boot de novo, agora com sessão.
    iniciarArmazenamento({ temSessao: true, exemplo: () => mesDeExemplo("2026-10-05") });
    const id = `novo${++uid}`;
    await startSync(id);

    expect(envios).toEqual([]);
    expect([...servidor.keys()].filter((k) => k.startsWith(`${id}:`))).toEqual([]);
    expect(load(SK.lancamentos, null)).toBeNull();
  });
});
