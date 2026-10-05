import { describe, it, expect } from "vitest";
import { estatisticasMes, reciboDoMes, nomeDoMes, MIN_DECISOES, tituloDoMes, TITULOS, conviteTexto } from "./recibo.js";
import { DEFAULT_CATEGORIAS } from "./categories.js";

// Horários no meio do dia (15h UTC = 12h no Brasil) pra não depender do fuso.
const d = (id, direction, dia, extra = {}) => ({ id, lancamentoId: `l${id}`, direction, label: direction === "right" ? "Paguei" : "x", categoria: "alimentacao", valor: 999, decidedAt: `2026-09-${dia}T15:00:00.000Z`, ...extra });

describe("recibo do mês", () => {
  it("mês fechado é o anterior; destaque só do dia 1 ao 7", () => {
    expect(reciboDoMes("2026-10-01")).toEqual({ ym: "2026-09", emDestaque: true });
    expect(reciboDoMes("2026-10-07").emDestaque).toBe(true);
    expect(reciboDoMes("2026-10-08")).toEqual({ ym: "2026-09", emDestaque: false });
    expect(reciboDoMes("2027-01-03").ym).toBe("2026-12");
  });

  it("conta só comportamento do mês, sem valor em R$", () => {
    const decisions = [
      d(1, "right", "02"), d(2, "right", "03"), d(3, "left", "03"),
      d(4, "right", "05", { lancamentoId: "l3" }), // l3 foi adiada antes de pagar
      d(5, "up", "06", { categoria: "lazer" }),
      d(6, "right", "06", { label: "Recebi", categoria: "renda" }), // entrada: não é "paga"
      d(7, "right", "20", { decidedAt: "2026-08-31T15:00:00.000Z" }), // outro mês
    ];
    const revisoes = {
      a: { veredito: "cortar", em: "2026-09-04T15:00:00.000Z" },
      b: { veredito: "valeu", em: "2026-09-04T15:00:00.000Z" },
      c: { veredito: "cortar", em: "2026-08-10T15:00:00.000Z" },
    };
    const conquistas = { "primeira-paga": "2026-09-02T15:00:00.000Z", "primeiro-lancamento": "2026-08-01T15:00:00.000Z" };
    const s = estatisticasMes({ decisions, revisoes, conquistas, categorias: DEFAULT_CATEGORIAS, ym: "2026-09", boraCriados: 2 });

    expect(s).toMatchObject({
      decididas: 6, pagas: 3, pctSemAdiar: 67, adiadas: 1, divididas: 1, cortes: 1,
      diasAtivos: 5, maiorSequencia: 5, categoriaTop: "Alimentação",
      conquistas: ["Conta paga"], boraCriados: 2, suficiente: true,
    });
    // Nenhum campo carrega dinheiro.
    expect(JSON.stringify(s)).not.toMatch(/999|valor|saldo/);
  });

  it("maior sequência é de dias seguidos, não de dias ativos", () => {
    const decisions = ["01", "02", "03", "10", "11"].map((dia, i) => d(i, "right", dia));
    const s = estatisticasMes({ decisions, ym: "2026-09" });
    expect(s.diasAtivos).toBe(5);
    expect(s.maiorSequencia).toBe(3);
  });

  it("decisão às 22h do último dia (já é dia 1 em UTC) conta no mês local", () => {
    const tarde = new Date(2026, 8, 30, 22, 0).toISOString();
    expect(estatisticasMes({ decisions: [d(1, "right", "30", { decidedAt: tarde })], ym: "2026-09" }).decididas).toBe(1);
  });

  it(`pouco uso (< ${MIN_DECISOES} decisões) não gera recibo`, () => {
    const s = estatisticasMes({ decisions: [d(1, "right", "02"), d(2, "left", "03")], ym: "2026-09" });
    expect(s.suficiente).toBe(false);
    expect(s.pctSemAdiar).toBe(100);
  });

  it("mês sem nenhuma conta paga não inventa porcentagem", () => {
    expect(estatisticasMes({ decisions: [], ym: "2026-09" }).pctSemAdiar).toBeNull();
  });

  it("nome do mês e convite de pouco uso", () => {
    expect(nomeDoMes("2026-09")).toBe("setembro 2026");
    expect(conviteTexto("2026-09")).toBe("Setembro foi tranquilo por aqui. Decida 5 contas em outubro e ganhe seu recibo.");
    expect(conviteTexto("2026-12")).toMatch(/^Dezembro .* em janeiro e ganhe/);
  });
});

describe("título do mês", () => {
  const base = { maiorSequencia: 2, cortes: 0, boraCriados: 0, divididas: 0, pagas: 1, pctSemAdiar: 50, adiadas: 0, conquistas: [] };
  const titulo = (extra) => tituloDoMes({ ...base, ...extra }).id;

  it("cada regra, isolada", () => {
    expect(titulo({ maiorSequencia: 14 })).toBe("maratonista");
    expect(titulo({ cortes: 3 })).toBe("tesoura");
    expect(titulo({ boraCriados: 3 })).toBe("bora");
    expect(titulo({ divididas: 3 })).toBe("rachador");
    expect(titulo({ pagas: 5, pctSemAdiar: 80 })).toBe("pagador");
    expect(titulo({ adiadas: 3, pagas: 3 })).toBe("adiador");
    expect(titulo({ conquistas: ["a", "b"] })).toBe("colecionador");
    expect(titulo({})).toBe("controle");
  });

  it("logo abaixo do limite não ganha o título", () => {
    expect(titulo({ maiorSequencia: 13, cortes: 2, boraCriados: 2, divididas: 2, conquistas: ["a"] })).toBe("controle");
    expect(titulo({ pagas: 5, pctSemAdiar: 79 })).toBe("controle");
    expect(titulo({ pagas: 4, pctSemAdiar: 100 })).toBe("controle");
    expect(titulo({ adiadas: 3, pagas: 4 })).toBe("controle");
  });

  it("vale o primeiro da lista quando várias regras batem", () => {
    expect(titulo({ maiorSequencia: 20, cortes: 5, pagas: 9, pctSemAdiar: 100 })).toBe("maratonista");
    expect(titulo({ cortes: 3, adiadas: 9 })).toBe("tesoura");
  });

  it("todos têm subtítulo e nenhum fala de dinheiro", () => {
    for (const t of TITULOS) {
      expect(t.subtitulo.length).toBeGreaterThan(10);
      expect(`${t.titulo} ${t.subtitulo}`).not.toMatch(/R\$|\d/);
    }
  });
});
