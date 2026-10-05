import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Regra: text-on-X (on-brand, on-nav, on-pos, on-neg) só em cima de bg-X.
//
// Cada expressão de classe vira o conjunto de combinações que ela pode
// produzir: `a ${c ? "b" : "d"}` → {a b} e {a d}; `${c && "b"}` → {b} e {}.
// Toda combinação com text-on-X precisa ter bg-X. Assim um bg-X que só existe
// num ramo do ternário não cobre o outro ramo (o bug da pílula de navegação).
//
// Fundo via style={{ backgroundColor }} é invisível aqui (o bug dos carimbos
// do swipe): use a classe bg-X.
//
// Quando o fundo está num elemento pai (conteúdo de card, item da pílula),
// o componente declara isso com um comentário logo acima dele:
//   // on-color: parent bg-brand
// O marcador vale até a próxima declaração de topo do arquivo e só libera as
// cores que nomeia.

const COR = /(?<![\w-])text-on-(brand|nav|pos|neg)(?![\w-])/g;
const temBg = (cls, cor) => new RegExp(`(?<![\\w-])bg-${cor}(?![\\w-])`).test(cls);

// ── Tokenizador mínimo de JS/JSX: strings, templates aninhados, comentários ──
function lerString(s, i) {
  const q = s[i];
  let j = i + 1;
  while (j < s.length && s[j] !== q && s[j] !== "\n") j += s[j] === "\\" ? 2 : 1;
  return { valor: s.slice(i + 1, j), fim: j + 1 };
}

// Lê uma expressão ${...} até o } que fecha; devolve as alternativas de texto.
function lerExpressao(s, i) {
  const literais = [];
  let profundidade = 0, j = i, topo = "";
  while (j < s.length) {
    const c = s[j];
    if (c === "'" || c === '"') { const r = lerString(s, j); if (profundidade === 0) literais.push([r.valor]); j = r.fim; continue; }
    if (c === "`") { const r = lerTemplate(s, j); if (profundidade === 0) literais.push(r.combos); j = r.fim; continue; }
    if (c === "{" || c === "(" || c === "[") profundidade++;
    else if (c === ")" || c === "]") profundidade--;
    else if (c === "}") { if (profundidade === 0) break; profundidade--; }
    else if (profundidade === 0) topo += c;
    j++;
  }
  const alts = literais.flat();
  // Só "cond ? 'a' : 'b'" com os dois ramos literais é fechado; qualquer outra
  // forma (&&, variável, ramo não literal) também pode render "".
  const ternarioFechado = literais.length === 2 && topo.includes("?") && topo.includes(":") && !/&&|\|\|/.test(topo);
  if (!ternarioFechado) alts.push("");
  return { alts, fim: j + 1 };
}

function lerTemplate(s, i) {
  let combos = [""], j = i + 1, lit = "";
  const junta = (alts) => { combos = combos.flatMap((c) => alts.map((a) => `${c}${lit} ${a} `)); lit = ""; };
  while (j < s.length && s[j] !== "`") {
    if (s[j] === "\\") { lit += s.slice(j, j + 2); j += 2; continue; }
    if (s[j] === "$" && s[j + 1] === "{") { const r = lerExpressao(s, j + 2); junta(r.alts); j = r.fim; continue; }
    lit += s[j++];
  }
  combos = combos.map((c) => c + lit);
  return { combos, fim: j + 1 };
}

// Todas as expressões de texto do arquivo, com linha e combinações possíveis.
function expressoes(src) {
  const out = [];
  const linha = (i) => src.slice(0, i).split("\n").length;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i) + 2; if (i < 2) break; continue; }
    if (c === "'" || c === '"') { const r = lerString(src, i); out.push({ linha: linha(i), combos: [r.valor] }); i = r.fim; continue; }
    if (c === "`") { const r = lerTemplate(src, i); out.push({ linha: linha(i), combos: r.combos }); i = r.fim; continue; }
    i++;
  }
  return out;
}

// Faixa de linhas coberta por cada marcador "on-color: parent bg-X".
function marcadores(src) {
  const linhas = src.split("\n");
  const topo = (l) => /^(export |function |const |let |class )/.test(l);
  const out = [];
  linhas.forEach((l, idx) => {
    const m = l.match(/\/\/\s*on-color:\s*parent\s+(.+)$/);
    if (!m) return;
    const cores = [...m[1].matchAll(/bg-(brand|nav|pos|neg)\b/g)].map((x) => x[1]);
    let decl = idx + 1;
    while (decl < linhas.length && !topo(linhas[decl])) decl++;
    let fim = decl + 1;
    while (fim < linhas.length && !topo(linhas[fim])) fim++;
    out.push({ de: idx + 1, ate: fim, cores });
  });
  return out;
}

function verificar(src, nome = "fixture") {
  const erros = [];
  const linhas = src.split("\n");
  const marks = marcadores(src);
  for (const { linha, combos } of expressoes(src)) {
    const faltando = new Set();
    for (const cls of combos) for (const [, cor] of cls.matchAll(COR)) if (!temBg(cls, cor)) faltando.add(cor);
    for (const cor of faltando) {
      if (marks.some((m) => linha >= m.de && linha <= m.ate && m.cores.includes(cor))) continue;
      const viaStyle = /backgroundColor|background:/.test(linhas[linha - 1]) ? " (fundo via style não conta: use a classe)" : "";
      erros.push(`${nome}:${linha} text-on-${cor} sem bg-${cor}${viaStyle}`);
    }
  }
  return erros;
}

function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : /\.jsx?$/.test(n) && !n.includes(".test.") ? [p] : [];
  });
}

describe("text-on-X só sobre bg-X", () => {
  it("nenhum uso fora do fundo certo no repo", () => {
    const erros = arquivos(join(__dirname, "..")).flatMap((f) => verificar(readFileSync(f, "utf8"), f.split("/src/").pop()));
    expect(erros).toEqual([]);
  });

  // Os 7 casos reais que passaram pelo codemod (código como estava em f124ef9).
  const REGRESSAO = {
    "badge da aba Atividade": `<span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-sm bg-neg text-on-brand text-[11px] font-semibold flex items-center justify-center px-[3px]">{tab.badge}</span>`,
    "NavBadge": `<span\n  className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-sm bg-neg text-on-brand text-[9px] font-bold flex items-center justify-center px-[3px] leading-none pointer-events-none"\n>`,
    "contador de pedidos no Social": `<span className="bg-neg text-on-brand text-[12px] font-semibold px-1.5 py-0.5 rounded-sm tabular-nums">{pendingIncoming.length}</span>`,
    "badge das abas do Social": `<span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-sm bg-neg text-on-brand text-[11px] font-semibold flex items-center justify-center px-[3px]">`,
    "toast": `function tom(color = "") {\n  if (color.includes("blue")) return { Icon: Info, cls: "text-on-brand" };\n}\n<motion.div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 rounded-md bg-nav text-on-brand text-sm">`,
    "pílula de navegação": "<button className={`flex items-center gap-2 h-11 rounded-full transition-colors text-on-brand ${ativo ? \"bg-brand px-4\" : \"w-12 justify-center opacity-70 hover:opacity-100\"}`}>",
    "carimbos do swipe": `function Carimbo({ opacity, bg, Icon, label }) {\n  return (\n    <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 pointer-events-none text-on-brand" style={{ backgroundColor: bg, opacity }}>\n      <Icon size={40} />\n    </motion.div>\n  );\n}`,
  };
  for (const [caso, src] of Object.entries(REGRESSAO)) {
    it(`pega o caso antigo: ${caso}`, () => {
      expect(verificar(src).some((e) => e.includes("text-on-brand sem bg-brand"))).toBe(true);
    });
  }

  it("toast antigo: pega as duas linhas (ícone e caixa)", () => {
    expect(verificar(REGRESSAO.toast)).toHaveLength(2);
  });

  it("carimbo antigo: avisa que fundo via style não conta", () => {
    expect(verificar(REGRESSAO["carimbos do swipe"])[0]).toMatch(/via style/);
  });

  it("ternário com bg-X nos dois ramos passa; && ou ramo sem bg-X não", () => {
    expect(verificar("<b className={`text-on-brand ${a ? \"bg-brand\" : \"bg-brand/90\"}`} />")).toEqual([]);
    expect(verificar("<b className={`bg-brand ${a && \"text-on-brand\"}`} />")).toEqual([]);
    expect(verificar("<b className={`p-2 ${a && \"text-on-brand\"}`} />")).toHaveLength(1);
    expect(verificar("<b className={`p-2 ${a ? `${x} text-on-neg` : \"\"}`} />")).toHaveLength(1);
  });

  it("marcador libera só a cor e o componente que nomeia", () => {
    const src = [
      "// on-color: parent bg-nav",
      "function Item() {",
      '  return <i className="text-on-nav" />;',
      "}",
      'export const Fora = () => <i className="text-on-nav" />;',
    ].join("\n");
    expect(verificar(src)).toEqual(["fixture:5 text-on-nav sem bg-nav"]);
    expect(verificar('// on-color: parent bg-nav\nfunction A() { return <i className="text-on-brand" />; }')).toHaveLength(1);
  });

  it("comentário com o nome da classe não conta", () => {
    expect(verificar("// tudo em text-on-brand\n/* text-on-neg */")).toEqual([]);
  });
});
