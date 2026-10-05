import { useState } from "react";
import { LancamentoRow } from "./LancamentoRow.jsx";
import { SectionTitle, SmallButton, EmptyHint } from "./ui.jsx";
import { findCategoria } from "../lib/categories.js";
import { formatBRL } from "../lib/money.js";
import { useOcultarValores } from "../lib/privacy.js";
import { toDateStr, fromDateStr, addDays, formatDateShort, todayKey, formatMonth } from "../lib/dates.js";
import { ocorrencias, custoEfetivo } from "../lib/finance.js";
import { CalendarDays } from "lucide-react";

const DAY_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

// Semanas completas (dom→sáb) cobrindo o mês de `view` (1º dia do mês).
function buildMonthGrid(view) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()));
  const days = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(toDateStr(d));
  return days;
}

// Ocorrências de fixos/dívidas ainda não materializadas (meses futuros):
// aparecem esmaecidas como "previsto", sem ações.
function previstos({ recorrentes, dividas }, de, ate) {
  const out = [];
  for (const r of recorrentes) {
    if (!r.ativo) continue;
    const ini = r.geradoAte ? addDays(r.geradoAte, 1) : (r.inicio || de);
    for (const data of ocorrencias(r, ini > de ? ini : de, ate)) {
      out.push({ id: `prev:r:${r.id}:${data}`, tipo: r.tipo, valor: r.valor, categoria: r.categoria, descricao: r.nome, data, status: "previsto", recorrenteId: r.id });
    }
  }
  for (const d of dividas) {
    if (d.saldoDevedor <= 0) continue;
    const ini = d.geradoAte ? addDays(d.geradoAte, 1) : de;
    for (const data of ocorrencias({ frequencia: "mensal", dia: d.diaVencimento }, ini > de ? ini : de, ate)) {
      out.push({ id: `prev:d:${d.id}:${data}`, tipo: "saida", valor: d.parcela, categoria: "dividas", descricao: d.nome, data, status: "previsto", dividaId: d.id });
    }
  }
  return out;
}

export function FinCalendar({ finance, onPagar, onEditar }) {
  const [ocultar] = useOcultarValores();
  const hoje = todayKey();
  const [view, setView] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
  const [sel, setSel] = useState(hoje);
  const { lancamentos, categorias } = finance;

  const grid = buildMonthGrid(view);
  const mesAtual = view.getMonth();
  const todos = [...lancamentos.filter(l => l.data), ...previstos(finance, grid[0], grid[grid.length - 1])];
  const porDia = {};
  for (const l of todos) (porDia[l.data] ||= []).push(l);

  function totais(itens) {
    let saidas = 0, entradas = 0, pendente = 0;
    for (const l of itens) {
      if (l.tipo === "entrada") entradas += l.valor;
      else { saidas += custoEfetivo(l); if (l.status !== "pago") pendente += custoEfetivo(l); }
    }
    return { saidas, entradas, pendente };
  }

  const doDia = (porDia[sel] || []).sort((a, b) => (a.status === "previsto") - (b.status === "previsto") || b.valor - a.valor);
  const tDia = totais(doDia);
  const semData = lancamentos.filter(l => !l.data && l.status !== "pago");
  const selDate = fromDateStr(sel);
  const selLabel = sel === hoje ? "Hoje" : selDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const noMesAtual = view.getFullYear() === new Date().getFullYear() && view.getMonth() === new Date().getMonth();

  function mudarMes(delta) { setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1)); }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-line bg-surface p-3">
        <div className="flex items-center justify-between mb-3 px-1">
          <button onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="w-7 h-7 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-fg">{formatMonth(toDateStr(view).slice(0, 7))}</span>
            {!(noMesAtual && sel === hoje) && <button onClick={() => { const t = new Date(); setView(new Date(t.getFullYear(), t.getMonth(), 1)); setSel(hoje); }} className="text-[12px] font-semibold text-brand-ink hover:text-fg transition">Hoje</button>}
          </div>
          <button onClick={() => mudarMes(1)} aria-label="Próximo mês" className="w-7 h-7 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAY_SHORT.map((d, i) => <div key={i} className="text-center text-[12px] font-semibold text-fg-3">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {grid.map(ds => {
            const inMonth = fromDateStr(ds).getMonth() === mesAtual;
            const itens = porDia[ds] || [];
            const t = totais(itens);
            const atrasado = ds < hoje && itens.some(l => l.tipo === "saida" && l.status !== "pago" && l.status !== "previsto");
            const isSel = ds === sel;
            return (
              <button key={ds} onClick={() => inMonth && setSel(ds)} disabled={!inMonth} aria-label={`${formatDateShort(ds)}${t.saidas ? `, saídas ${formatBRL(t.saidas, { oculto: ocultar })}` : ""}${t.entradas ? `, entradas ${formatBRL(t.entradas, { oculto: ocultar })}` : ""}`}
                className={`flex flex-col items-center gap-0.5 py-1 rounded-md ${isSel ? "bg-brand/[0.06]" : ""}`}>
                <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[12px] font-medium ${!inMonth ? "text-fg-3/40" : ds === hoje ? "bg-brand text-on-brand" : atrasado ? "text-neg" : "text-fg"}`}>{fromDateStr(ds).getDate()}</span>
                <span className="h-3 text-[10px] leading-3 tabular-nums">
                  {inMonth && t.saidas > 0 && <span className={atrasado ? "text-neg" : t.pendente > 0 ? "text-fg-2" : "text-fg-3"}>{ocultar ? "•••" : formatBRL(t.saidas, { compact: true }).replace("R$ ", "")}</span>}
                  {inMonth && !t.saidas && t.entradas > 0 && <span className="text-pos">+{ocultar ? "•••" : formatBRL(t.entradas, { compact: true }).replace("R$ ", "")}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle>{selLabel}</SectionTitle>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[{ l: "A pagar", v: tDia.pendente, c: "text-fg" }, { l: "Saídas", v: tDia.saidas, c: "text-fg" }, { l: "Entradas", v: tDia.entradas, c: "text-pos" }].map(x => (
            <div key={x.l} className="rounded-md bg-surface border border-line px-3 py-2">
              <p className="text-[12px] text-fg-3">{x.l}</p>
              <p className={`text-[13px] font-semibold tabular-nums ${x.c}`}>{formatBRL(x.v, { oculto: ocultar })}</p>
            </div>
          ))}
        </div>
        {doDia.length === 0 ? (
          <p className="text-[12px] text-fg-3 px-1">Nada vence nesse dia.</p>
        ) : (
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">
            {doDia.map(l => {
              const previsto = l.status === "previsto";
              return (
                <LancamentoRow key={l.id} lancamento={l} categoria={findCategoria(categorias, l.categoria)} previsto={previsto}
                  onClick={previsto ? undefined : () => onEditar(l)}
                  actions={!previsto && l.status !== "pago" && <SmallButton tone="green" onClick={() => onPagar(l)}>{l.tipo === "entrada" ? "Recebi" : "Paguei"}</SmallButton>} />
              );
            })}
          </div>
        )}
      </div>

      <div>
        <SectionTitle>Sem vencimento definido · {semData.length}</SectionTitle>
        {semData.length === 0 ? (
          <EmptyHint icon={CalendarDays} title="Tudo com data">Lançamentos sem data aparecem aqui pra você encaixar num dia.</EmptyHint>
        ) : (
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">
            {semData.map(l => (
              <LancamentoRow key={l.id} lancamento={l} categoria={findCategoria(categorias, l.categoria)} onClick={() => onEditar(l)}
                actions={<SmallButton tone="blue" onClick={() => finance.atualizarLancamento(l.id, { data: sel })}>+ {sel === hoje ? "hoje" : formatDateShort(sel)}</SmallButton>} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
