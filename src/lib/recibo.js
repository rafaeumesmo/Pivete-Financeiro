import { toDateStr, addMonths, monthKey, addDays } from "./dates.js";
import { findCategoria } from "./categories.js";
import { CONQUISTAS } from "./conquistas.js";

// Recibo do mês: só comportamento, NENHUM valor em R$ (nem saldo, gasto ou
// dívida). Sai do histórico de decisões do deck (decisions), das revisões
// (revisoes) e das conquistas — tudo que já fica no aparelho.

export const MIN_DECISOES = 5;   // abaixo disso, convite pra usar mais em vez do recibo
export const DIAS_EM_DESTAQUE = 7; // do dia 1 ao 7 do mês seguinte, aviso na Início

// Data local (YYYY-MM-DD) de um ISO ou de uma data pura. new Date("2026-10-01")
// seria meia-noite UTC — 21h do dia anterior no Brasil.
function diaLocal(v) {
  if (!v) return null;
  const s = String(v);
  return s.length === 10 ? s : toDateStr(new Date(s));
}
const mesDe = (v) => diaLocal(v)?.slice(0, 7) ?? null;

// Mês fechado do recibo: o anterior ao de hoje. emDestaque = dias 1–7.
export function reciboDoMes(hoje) {
  return { ym: monthKey(addMonths(hoje, -1, 1)), emDestaque: Number(hoje.slice(8, 10)) <= DIAS_EM_DESTAQUE };
}

function maiorSequencia(dias) {
  const ordenados = [...new Set(dias)].sort();
  let melhor = 0, atual = 0, anterior = null;
  for (const d of ordenados) {
    atual = anterior && addDays(anterior, 1) === d ? atual + 1 : 1;
    melhor = Math.max(melhor, atual);
    anterior = d;
  }
  return melhor;
}

export function estatisticasMes({ decisions = [], revisoes = {}, conquistas = {}, categorias = [], ym, boraCriados = 0 }) {
  const doMes = decisions.filter((d) => mesDe(d.decidedAt) === ym);
  // Pagas = contas (saídas) pagas no mês; "Recebi" é entrada e fica de fora.
  const pagas = doMes.filter((d) => d.direction === "right" && d.label !== "Recebi");
  const adiouAntes = (p) => decisions.some((d) => d.direction === "left" && d.lancamentoId === p.lancamentoId && d.decidedAt < p.decidedAt);
  const pagasSemAdiar = pagas.filter((p) => !adiouAntes(p)).length;
  const cortesDoMes = Object.values(revisoes).filter((r) => r?.veredito === "cortar" && mesDe(r.em) === ym);

  const contagem = {};
  for (const d of doMes) if (d.categoria) contagem[d.categoria] = (contagem[d.categoria] || 0) + 1;
  const topId = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const diasAtivos = [...doMes.map((d) => diaLocal(d.decidedAt)), ...cortesDoMes.map((r) => diaLocal(r.em))];

  return {
    ym,
    decididas: doMes.length,
    pagas: pagas.length,
    pctSemAdiar: pagas.length ? Math.round((pagasSemAdiar / pagas.length) * 100) : null,
    adiadas: doMes.filter((d) => d.direction === "left").length,
    divididas: doMes.filter((d) => d.direction === "up").length,
    cortes: cortesDoMes.length,
    diasAtivos: new Set(diasAtivos).size,
    maiorSequencia: maiorSequencia(diasAtivos),
    categoriaTop: topId ? findCategoria(categorias, topId).nome : null,
    conquistas: CONQUISTAS.filter((q) => mesDe(conquistas[q.id]) === ym).map((q) => q.nome),
    boraCriados,
    suficiente: doMes.length >= MIN_DECISOES,
  };
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function nomeDoMes(ym) {
  const [a, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}
export function nomeMesCurto(ym) { return MESES[Number(ym.slice(5, 7)) - 1]; }

// "Setembro foi tranquilo por aqui. Decida 5 contas em outubro e ganhe seu recibo."
export function conviteTexto(ym) {
  const mes = nomeMesCurto(ym), seguinte = nomeMesCurto(monthKey(addMonths(`${ym}-01`, 1, 1)));
  return `${mes[0].toUpperCase()}${mes.slice(1)} foi tranquilo por aqui. Decida ${MIN_DECISOES} contas em ${seguinte} e ganhe seu recibo.`;
}

// Título do mês: vale o primeiro da lista cuja regra bate (do padrão mais
// raro ao mais comum). Tom carinhoso, nunca humilhante. Só com mês suficiente.
export const TITULOS = [
  { id: "maratonista",  titulo: "Maratonista",                subtitulo: "Abriu o app mais que a geladeira.",            regra: (s) => s.maiorSequencia >= 14 },
  { id: "tesoura",      titulo: "Tesoura Afiada",             subtitulo: "Cortou sem dó. Nem o delivery escapou.",       regra: (s) => s.cortes >= 3 },
  { id: "bora",         titulo: "Mestre do Bora",             subtitulo: "Nenhum rolê é decidido sem passar por você.", regra: (s) => s.boraCriados >= 3 },
  { id: "rachador",     titulo: "Rachador Oficial",           subtitulo: "Conta boa é conta dividida.",                  regra: (s) => s.divididas >= 3 },
  { id: "pagador",      titulo: "Pagador em Dia",             subtitulo: "Boleto nem esquentou a caixa de entrada.",     regra: (s) => s.pagas >= 5 && s.pctSemAdiar >= 80 },
  { id: "adiador",      titulo: "O Adiador Profissional",     subtitulo: "Não fugiu de nenhuma. Só remarcou todas.",     regra: (s) => s.adiadas >= 3 && s.adiadas >= s.pagas },
  { id: "colecionador", titulo: "Colecionador de Conquistas", subtitulo: "Farmou conquista o mês inteiro.",              regra: (s) => s.conquistas.length >= 2 },
  { id: "controle",     titulo: "No Controle",                subtitulo: "Sem drama, sem susto. Mês resolvido.",         regra: () => true },
];

export function tituloDoMes(stats) {
  return TITULOS.find((t) => t.regra(stats));
}
