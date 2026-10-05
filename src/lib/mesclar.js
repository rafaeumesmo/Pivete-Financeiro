import { SK } from "./storage.js";
import { formatBRL } from "./money.js";

// Junta os dados do convidado (este aparelho) com os da conta, no primeiro
// login/cadastro neste aparelho. Pura, pra poder testar (mesclar.test.js).
// Regra: não apagar nada.
//   - listas com id: une pelo id; mesmo id dos dois lados → vale o servidor
//   - mapas (revisões, conquistas): une as chaves; chave repetida → servidor
//   - contadores (stats): soma
//   - valores únicos (saldo de uma mesma conta, configurações, tema, perfil,
//     sequência, conta padrão, chave Pix): servidor vence; vazio no servidor
//     conta como "não tem" e fica o do aparelho

const LISTAS = {
  [SK.lancamentos]: ["lançamento", "lançamentos"],
  [SK.recorrentes]: ["fixo", "fixos"],
  [SK.dividas]:     ["dívida", "dívidas"],
  [SK.contas]:      ["conta", "contas"],
  [SK.metas]:       ["caixinha", "caixinhas"],
  [SK.categorias]:  ["categoria", "categorias"],
  [SK.cobrancas]:   ["cobrança", "cobranças"],
  [SK.decisions]:   null, // histórico interno, fica fora do resumo
};
const MAPAS = [SK.revisoes, SK.conquistas];
const SOMAS = [SK.stats];

const vazio = (v) => v === undefined || v === null || v === "";
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const norm = (s) => String(s ?? "").trim().toLowerCase();

function unirLista(remoto = [], local = []) {
  const ids = new Set(remoto.map((x) => x?.id).filter((id) => id !== undefined));
  const novos = local.filter((x) => (x?.id !== undefined ? !ids.has(x.id) : !remoto.some((r) => igual(r, x))));
  return { lista: [...remoto, ...novos], novos };
}

function somar(remoto = {}, local = {}) {
  const out = { ...remoto };
  for (const [k, v] of Object.entries(local)) out[k] = typeof v === "number" && typeof out[k] === "number" ? out[k] + v : out[k] ?? v;
  return out;
}

// local / remoto: { [chave]: valor } só com as chaves que existem de cada lado.
export function mesclarConvidado({ local = {}, remoto = {} }) {
  const valores = {};
  const trazidos = {};
  const novosPorChave = {};

  for (const k of new Set([...Object.keys(local), ...Object.keys(remoto)])) {
    const l = local[k], r = remoto[k];
    if (k in LISTAS && (Array.isArray(l) || Array.isArray(r))) {
      const { lista, novos } = unirLista(Array.isArray(r) ? r : [], Array.isArray(l) ? l : []);
      valores[k] = k === SK.decisions ? [...lista].sort((a, b) => String(b.decidedAt).localeCompare(String(a.decidedAt))) : lista;
      novosPorChave[k] = novos;
      if (LISTAS[k] && novos.length) trazidos[k] = novos.length;
    } else if (MAPAS.includes(k)) {
      valores[k] = { ...(l || {}), ...(r || {}) };
    } else if (SOMAS.includes(k)) {
      valores[k] = vazio(r) ? l : vazio(l) ? r : somar(r, l);
    } else {
      valores[k] = vazio(r) ? l : r;
    }
  }

  // Duplicata óbvia: algo que veio do aparelho com o mesmo nome (e valor, nos
  // fixos) de algo que já estava na conta. Não junta sozinho: só avisa.
  const duplicados = [];
  const fixosConta = remoto[SK.recorrentes] || [];
  for (const f of novosPorChave[SK.recorrentes] || []) {
    if (fixosConta.some((r) => norm(r.nome) === norm(f.nome) && r.valor === f.valor)) duplicados.push({ tipo: "fixo", nome: f.nome, valor: f.valor });
  }
  const contasConta = remoto[SK.contas] || [];
  for (const c of novosPorChave[SK.contas] || []) {
    if (contasConta.some((r) => norm(r.nome) === norm(c.nome))) duplicados.push({ tipo: "conta", nome: c.nome });
  }

  // Mesma conta dos dois lados com saldo diferente: ficou o do servidor.
  const contasLocal = local[SK.contas] || [];
  const saldoMantido = contasConta.some((r) => contasLocal.some((l) => l.id === r.id && l.saldo !== r.saldo));

  const enviar = Object.keys(valores).filter((k) => !vazio(valores[k]) && !igual(valores[k], remoto[k]));
  return { valores, enviar, trazidos, duplicados, saldoMantido };
}

// "Trouxemos 12 lançamentos, 3 fixos e 1 caixinha deste aparelho."
export function resumoTexto(trazidos) {
  const partes = Object.entries(LISTAS)
    .filter(([k, nomes]) => nomes && trazidos[k])
    .map(([k, [um, varios]]) => `${trazidos[k]} ${trazidos[k] === 1 ? um : varios}`);
  if (!partes.length) return null;
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}`;
  return `Trouxemos ${lista} deste aparelho.`;
}

export const SALDO_MANTIDO_TEXTO = "O saldo da conta foi mantido; confira se precisa ajustar.";

export function duplicadoTexto(d) {
  return d.tipo === "fixo" ? `Fixo "${d.nome}" de ${formatBRL(d.valor)}` : `Conta "${d.nome}"`;
}
