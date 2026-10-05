import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// O framer-motion escreve `transform` inline em todo motion.* que anima x/y/
// scale/rotate (inclusive whileTap). Isso apaga qualquer translate/rotate/
// scale do Tailwind no mesmo elemento: foi assim que o toast, centralizado com
// -translate-x-1/2, saía da tela no celular. Centralize num wrapper comum.

const TRANSFORM = /(?:^|[\s"'`])(?:[\w-]+:)?-?(?:translate-[xy]|rotate|scale|skew-[xy])-[^\s"'`}]+/;

// Abertura de cada <motion.x ...> (pode ocupar várias linhas).
function tagsMotion(src) {
  const out = [];
  for (const m of src.matchAll(/<motion\.\w+/g)) {
    let i = m.index + m[0].length, prof = 0;
    for (; i < src.length; i++) {
      if (src[i] === "{") prof++;
      else if (src[i] === "}") prof--;
      else if (src[i] === ">" && prof === 0) break;
    }
    out.push({ linha: src.slice(0, m.index).split("\n").length, tag: src.slice(m.index, i) });
  }
  return out;
}

function verificar(src, nome = "fixture") {
  return tagsMotion(src)
    .filter(({ tag }) => [...tag.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].some((c) => TRANSFORM.test(c[1] ?? c[2])))
    .map(({ linha }) => `${nome}:${linha} motion.* com transform do Tailwind`);
}

function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : /\.jsx$/.test(n) ? [p] : [];
  });
}

describe("motion.* sem translate/rotate/scale do Tailwind", () => {
  it("nenhum no repo", () => {
    const erros = arquivos(join(__dirname, "..")).flatMap((f) => verificar(readFileSync(f, "utf8"), f.split("/src/").pop()));
    expect(erros).toEqual([]);
  });

  it("pega o toast antigo (f124ef9)", () => {
    const toast = `<motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }} className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50">`;
    expect(verificar(toast)).toHaveLength(1);
  });

  it("pega tag em várias linhas e template; ignora elemento comum", () => {
    expect(verificar("<motion.span\n  animate={{ x: 1 }}\n  className={`absolute ${a} -rotate-[20deg]`}\n>")).toHaveLength(1);
    expect(verificar('<nav className="fixed left-1/2 -translate-x-1/2">')).toEqual([]);
  });
});
