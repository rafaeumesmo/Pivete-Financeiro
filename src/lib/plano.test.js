import { describe, it, expect } from "vitest";
import { PRO_ATIVO, LIMITES_GRATIS, temPro, pode, liberado, maxEscudos, limiteTexto, limitesValem } from "./plano.js";

const DESLIGADO = { proAtivo: false };
const LIGADO = { proAtivo: true };
const gratis = { plano: "gratis", logado: true };
const pro = { plano: "pro", logado: true };
const convidado = { plano: "gratis", logado: false };
const RECURSOS = Object.keys(LIMITES_GRATIS);

describe("plano", () => {
  it("o Pro está desligado no código", () => {
    expect(PRO_ATIVO).toBe(false);
  });

  it("convidado nunca é Pro, mesmo com plano pro gravado", () => {
    expect(temPro({ plano: "pro", logado: false })).toBe(false);
    expect(temPro(pro)).toBe(true);
    expect(temPro(gratis)).toBe(false);
  });

  describe("flag desligada: nada muda", () => {
    it("criar está sempre liberado, mesmo muito acima do limite", () => {
      for (const r of RECURSOS) for (const quem of [gratis, convidado, pro]) {
        expect(pode(r, { ...quem, usados: 999 }, DESLIGADO)).toEqual({ ok: true, limite: null });
      }
    });
    it("o padrão (sem passar a flag) também libera", () => {
      expect(pode("caixinhas", { ...convidado, usados: 50 }).ok).toBe(true);
    });
    it("recursos Pro novos liberados", () => {
      expect(liberado(convidado, DESLIGADO)).toBe(true);
      expect(liberado(gratis)).toBe(true);
    });
    it("não precisa contar nada (sem rede à toa)", () => {
      expect(limitesValem(gratis, DESLIGADO)).toBe(false);
      expect(limitesValem(convidado)).toBe(false);
    });
    it("escudo continua acumulando até 2, como hoje", () => {
      for (const quem of [gratis, convidado, pro]) expect(maxEscudos(quem, DESLIGADO)).toBe(2);
    });
  });

  describe("flag ligada", () => {
    it("grátis cria até o limite e para nele", () => {
      expect(pode("cobrancas", { ...gratis, usados: 2 }, LIGADO)).toEqual({ ok: true, limite: 3 });
      expect(pode("cobrancas", { ...gratis, usados: 3 }, LIGADO)).toEqual({ ok: false, limite: 3 });
      expect(pode("bora", { ...gratis, usados: 3 }, LIGADO).ok).toBe(false);
      expect(pode("caixinhas", { ...gratis, usados: 0 }, LIGADO).ok).toBe(true);
      expect(pode("caixinhas", { ...gratis, usados: 1 }, LIGADO).ok).toBe(false);
      expect(pode("categorias", { ...gratis, usados: 3 }, LIGADO).ok).toBe(false);
    });
    it("acima do limite (ex.: 4 caixinhas de antes) só bloqueia criar mais", () => {
      expect(pode("caixinhas", { ...gratis, usados: 4 }, LIGADO).ok).toBe(false);
    });
    it("convidado segue o grátis", () => {
      expect(pode("cobrancas", { ...convidado, usados: 3 }, LIGADO).ok).toBe(false);
      expect(liberado(convidado, LIGADO)).toBe(false);
    });
    it("Pro cria sem limite e tem os recursos novos", () => {
      for (const r of RECURSOS) expect(pode(r, { ...pro, usados: 999 }, LIGADO).ok).toBe(true);
      expect(liberado(pro, LIGADO)).toBe(true);
    });
    it("recurso sem limite no grátis não bloqueia", () => {
      expect(pode("seletorIcone", { ...gratis, usados: 999 }, LIGADO).ok).toBe(true);
    });
    it("limites valem pro grátis e convidado, não pro Pro", () => {
      expect(limitesValem(gratis, LIGADO)).toBe(true);
      expect(limitesValem(convidado, LIGADO)).toBe(true);
      expect(limitesValem(pro, LIGADO)).toBe(false);
    });
    it("escudo: grátis guarda 1, Pro guarda 3, convidado 1", () => {
      expect(maxEscudos(gratis, LIGADO)).toBe(1);
      expect(maxEscudos(pro, LIGADO)).toBe(3);
      expect(maxEscudos({ plano: "pro", logado: false }, LIGADO)).toBe(1);
    });
  });

  it("texto do limite no singular e no plural", () => {
    expect(limiteTexto("caixinhas", 1)).toBe("No grátis dá pra ter 1 caixinha. O Pro libera mais — em breve.");
    expect(limiteTexto("cobrancas", 3)).toBe("No grátis dá pra ter 3 cobranças abertas. O Pro libera mais — em breve.");
  });
});
