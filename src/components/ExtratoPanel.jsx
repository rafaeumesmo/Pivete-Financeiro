import { useState } from "react";
import { LancamentoRow } from "./LancamentoRow.jsx";
import { EmptyHint, EyeButton } from "./ui.jsx";
import { findCategoria } from "../lib/categories.js";
import { formatBRL } from "../lib/money.js";
import { todayKey, monthKey, formatMonth, fromDateStr } from "../lib/dates.js";
import { custoEfetivo } from "../lib/finance.js";
import { useOcultarValores } from "../lib/privacy.js";
import { Receipt } from "lucide-react";

const selectCls = "rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none focus:border-brand min-w-0";

export function ExtratoPanel({ finance, onEditar }) {
  const { lancamentos, categorias } = finance;
  const atual = monthKey(todayKey());
  const meses = [...new Set([atual, ...lancamentos.filter(l => l.data).map(l => monthKey(l.data))])].sort().reverse();
  const [mes, setMes] = useState(atual);
  const [cat, setCat] = useState("todas");
  const [tipo, setTipo] = useState("todos");
  const [ocultar] = useOcultarValores();

  const lista = lancamentos
    .filter(l => l.data && monthKey(l.data) === mes)
    .filter(l => cat === "todas" || l.categoria === cat)
    .filter(l => tipo === "todos" || l.tipo === tipo)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  const entradas = lista.filter(l => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0);
  const saidas = lista.filter(l => l.tipo === "saida").reduce((a, l) => a + custoEfetivo(l), 0);
  const porDia = [];
  for (const l of lista) {
    const g = porDia[porDia.length - 1];
    if (g?.data === l.data) g.itens.push(l); else porDia.push({ data: l.data, itens: [l] });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros numa linha só, acima da lista */}
      <div className="grid grid-cols-3 gap-2">
        <select aria-label="Mês" value={mes} onChange={e => setMes(e.target.value)} className={selectCls}>
          {meses.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        <select aria-label="Categoria" value={cat} onChange={e => setCat(e.target.value)} className={selectCls}>
          <option value="todas">Todas categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select aria-label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} className={selectCls}>
          <option value="todos">Entradas e saídas</option>
          <option value="entrada">Só entradas</option>
          <option value="saida">Só saídas</option>
        </select>
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
        {[{ l: "Entradas", v: entradas, c: "text-pos" }, { l: "Saídas", v: saidas, c: "text-fg" }, { l: "Saldo", v: entradas - saidas, c: entradas - saidas >= 0 || ocultar ? "text-fg" : "text-neg" }].map(x => (
          <div key={x.l} className="rounded-md bg-surface border border-line px-3 py-2">
            <p className="text-[12px] text-fg-3">{x.l}</p>
            <p className={`text-[13px] font-semibold tabular-nums ${x.c}`}>{formatBRL(x.v, { oculto: ocultar })}</p>
          </div>
        ))}
        <EyeButton />
      </div>

      {lista.length === 0 ? (
        <EmptyHint icon={Receipt} title="Nada por aqui">Nenhum lançamento com esses filtros em {formatMonth(mes).toLowerCase()}.</EmptyHint>
      ) : porDia.map(g => (
        <div key={g.data}>
          <p className="text-[12px] font-semibold text-fg-3 mb-1.5 px-1 capitalize">{fromDateStr(g.data).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}</p>
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">
            {g.itens.map(l => <LancamentoRow key={l.id} lancamento={l} categoria={findCategoria(categorias, l.categoria)} onClick={() => onEditar(l)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
