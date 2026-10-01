import { describe, it, expect } from "vitest";
import {
  assinaturaAtiva, linhaDaPreapproval, lerXSignature, manifestoWebhook,
} from "../../supabase/functions/_shared/assinatura.js";
import { cpfValido, mascaraCpf } from "./cpf.js";

const AGORA = new Date("2026-10-01T12:00:00Z");

describe("assinaturaAtiva", () => {
  it("sem linha: não", () => {
    expect(assinaturaAtiva(null, AGORA)).toBe(false);
  });
  it("autorizada: sim, mesmo sem data", () => {
    expect(assinaturaAtiva({ status: "authorized", pago_ate: null }, AGORA)).toBe(true);
  });
  it("cancelada: vale até o fim do mês pago", () => {
    expect(assinaturaAtiva({ status: "cancelled", pago_ate: "2026-10-15T00:00:00Z" }, AGORA)).toBe(true);
    expect(assinaturaAtiva({ status: "cancelled", pago_ate: "2026-09-30T00:00:00Z" }, AGORA)).toBe(false);
  });
  it("pendente sem mês pago: não", () => {
    expect(assinaturaAtiva({ status: "pending", pago_ate: null }, AGORA)).toBe(false);
  });
});

describe("linhaDaPreapproval", () => {
  it("autorizada: pago_ate = próxima cobrança", () => {
    const r = linhaDaPreapproval({ id: "abc", status: "authorized", next_payment_date: "2026-11-01T10:00:00.000-04:00" });
    expect(r).toEqual({ mp_preapproval_id: "abc", status: "authorized", pago_ate: "2026-11-01T14:00:00.000Z" });
  });
  it("cancelou: mantém o pago_ate anterior", () => {
    const r = linhaDaPreapproval(
      { id: "abc", status: "cancelled", next_payment_date: "2026-12-01T00:00:00Z" },
      { pago_ate: "2026-11-01T00:00:00.000Z" },
    );
    expect(r.status).toBe("cancelled");
    expect(r.pago_ate).toBe("2026-11-01T00:00:00.000Z");
  });
  it("nunca encurta o que já foi pago", () => {
    const r = linhaDaPreapproval(
      { id: "abc", status: "authorized", next_payment_date: "2026-10-20T00:00:00Z" },
      { pago_ate: "2026-11-01T00:00:00.000Z" },
    );
    expect(r.pago_ate).toBe("2026-11-01T00:00:00.000Z");
  });
  it("status desconhecido vira pending", () => {
    expect(linhaDaPreapproval({ id: 1, status: "xyz" }).status).toBe("pending");
  });
});

describe("webhook", () => {
  it("lê o header x-signature", () => {
    expect(lerXSignature("ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839"))
      .toEqual({ ts: "1704908010", v1: "618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839" });
    expect(lerXSignature("")).toBeNull();
    expect(lerXSignature("ts=1")).toBeNull();
  });
  it("monta o manifesto no formato do Mercado Pago", () => {
    expect(manifestoWebhook({ dataId: "ABC123", requestId: "req-1", ts: "99" }))
      .toBe("id:abc123;request-id:req-1;ts:99;");
    expect(manifestoWebhook({ dataId: null, requestId: null, ts: "99" })).toBe("ts:99;");
  });
});

describe("cpf", () => {
  it("confere os dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224724")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });
  it("formata enquanto digita", () => {
    expect(mascaraCpf("52998224725")).toBe("529.982.247-25");
    expect(mascaraCpf("5299822")).toBe("529.982.2");
    expect(mascaraCpf("52998224725999")).toBe("529.982.247-25");
  });
});
