// Perfil: métricas derivadas + conquistas que dão XP. Funções puras.
import { toDateStr, monthKey, addMonths } from "./dates.js";
import { fixosMensais, parcelasDividasMensais, gastoVariavelMedio, resumoMes } from "./finance.js";

export const XP_POR_DECISAO = 10;
export const XP_POR_NIVEL = 500;

// Custo de vida mensal = fixos + parcelas de dívida + gasto variável médio.
export function custoMensal({ recorrentes, dividas, lancamentos }, hoje) {
  return fixosMensais(recorrentes) + parcelasDividasMensais(dividas) + gastoVariavelMedio(lancamentos, hoje);
}

// Reserva = tudo que está guardado em caixinhas.
export function reservaAtual(metas) {
  return metas.reduce((a, m) => a + m.guardado, 0);
}

// Saídas pagas até o dia do vencimento / saídas pagas com vencimento.
export function taxaEmDia(lancamentos) {
  const pagas = lancamentos.filter(l => l.tipo === "saida" && l.status === "pago" && l.data && l.pagoEm);
  if (!pagas.length) return null;
  const emDia = pagas.filter(l => toDateStr(new Date(l.pagoEm)) <= l.data).length;
  return { emDia, total: pagas.length, pct: emDia / pagas.length };
}

export const CONQUISTAS = [
  { id: "primeiro-lancamento", icon: "📝", nome: "Primeiro passo",       desc: "Registrou o primeiro lançamento.",            xp: 50,  check: c => c.lancamentos.length > 0 },
  { id: "primeira-paga",       icon: "✅", nome: "Conta paga",           desc: "Pagou a primeira conta pelo app.",            xp: 50,  check: c => c.lancamentos.some(l => l.tipo === "saida" && l.status === "pago") },
  { id: "pontual",             icon: "⏱️", nome: "Pontual",              desc: "10 contas pagas até o vencimento.",           xp: 150, check: c => (taxaEmDia(c.lancamentos)?.emDia || 0) >= 10 },
  { id: "semana",              icon: "🔥", nome: "Semana no controle",   desc: "7 dias seguidos registrando ou revisando.",   xp: 150, check: c => (c.streak.best || 0) >= 7 },
  { id: "tesoura",             icon: "✂️", nome: "Tesoura afiada",       desc: "Marcou um gasto pra cortar na revisão.",      xp: 100, check: c => Object.values(c.revisoes).some(r => r.veredito === "cortar") },
  { id: "primeira-caixinha",   icon: "🐷", nome: "Primeira caixinha",    desc: "Guardou dinheiro numa caixinha.",             xp: 50,  check: c => c.metas.some(m => m.guardado > 0) },
  { id: "meta-batida",         icon: "🏆", nome: "Meta batida",          desc: "Completou uma caixinha.",                     xp: 300, check: c => c.metas.some(m => m.alvo > 0 && m.guardado >= m.alvo) },
  { id: "mes-azul",            icon: "💙", nome: "Mês no azul",          desc: "Fechou o mês com mais recebido que pago.", xp: 200, check: c => { const r = resumoMes(c.lancamentos.filter(l => l.status === "pago"), monthKey(addMonths(c.hoje, -1, 1))); return r.entradas > 0 && r.sobra > 0; } },
  { id: "reserva-1",           icon: "🛟", nome: "Reserva de 1 mês",     desc: "Guardou o equivalente a 1 mês de custo.",     xp: 300, check: c => c.custo > 0 && c.reserva >= c.custo },
  { id: "reserva-completa",    icon: "🏰", nome: "Reserva completa",     desc: "Bateu a meta de reserva de emergência.",      xp: 800, check: c => c.custo > 0 && c.reserva >= c.custo * c.reservaMeses },
  { id: "divida-quitada",      icon: "💳", nome: "Primeira dívida quitada", desc: "Zerou o saldo de uma dívida.",             xp: 500, check: c => c.dividas.some(d => d.quitadaEm) },
];

// ctx: { lancamentos, dividas, metas, revisoes, streak, recorrentes, reservaMeses, hoje }
export function avaliarConquistas(ctx) {
  const full = { ...ctx, custo: custoMensal(ctx, ctx.hoje), reserva: reservaAtual(ctx.metas) };
  return CONQUISTAS.filter(q => q.check(full)).map(q => q.id);
}

export function xpTotal(decisoes, desbloqueadas) {
  const bonus = CONQUISTAS.filter(q => desbloqueadas[q.id]).reduce((a, q) => a + q.xp, 0);
  return decisoes * XP_POR_DECISAO + bonus;
}

export function nivel(xp) {
  return { nivel: Math.floor(xp / XP_POR_NIVEL) + 1, noNivel: xp % XP_POR_NIVEL, porNivel: XP_POR_NIVEL };
}
