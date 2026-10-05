import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, EmptyHint, inputCls, labelCls } from "./ui.jsx";
import { findCategoria } from "../lib/categories.js";
import { formatBRL } from "../lib/money.js";
import { todayKey } from "../lib/dates.js";
import { CreditCard, Pause, Play, Repeat, TriangleAlert } from "lucide-react";
import {
  frequenciaLabel, valorMensal, parcelasRestantes, jurosAlto, fixosMensais, rendaMensal, DAY_NAMES, JUROS_ALTO_MES,
} from "../lib/finance.js";
import { ICON_STROKE } from "../lib/icons.js";
import { useAcesso } from "../hooks/useAcesso.js";
import { CategoryTile } from "./CategoryTile.jsx";

export function FixosDividasPanel({ finance, showToast }) {
  const { exigirConta } = useAcesso();
  const { recorrentes, dividas, categorias } = finance;
  const [recEdit, setRecEdit] = useState(null);
  const [divEdit, setDivEdit] = useState(null);
  const saidas = recorrentes.filter(r => r.tipo === "saida");
  const entradas = recorrentes.filter(r => r.tipo === "entrada");
  const ativas = dividas.filter(d => d.saldoDevedor > 0);
  const quitadas = dividas.filter(d => d.saldoDevedor <= 0);

  function RecRow({ r }) {
    const cat = findCategoria(categorias, r.categoria);
    return (
      <div className={`flex items-center gap-3 px-3.5 py-3 ${r.ativo ? "" : "opacity-50"}`}>
        <button type="button" onClick={() => setRecEdit(r)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <CategoryTile categoria={cat} size={36} />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-fg truncate">{r.nome}</span>
            <span className="block text-[12px] text-fg-3">{r.ativo ? frequenciaLabel(r) : "Pausado"}{r.frequencia === "semanal" ? ` · ≈ ${formatBRL(valorMensal(r))}/mês` : ""}</span>
          </span>
        </button>
        <span className={`text-[13px] font-semibold tabular-nums ${r.tipo === "entrada" ? "text-pos" : "text-fg"}`}>{formatBRL(r.valor)}</span>
        <button type="button" onClick={() => finance.alternarRecorrente(r.id)} aria-label={r.ativo ? `Pausar ${r.nome}` : `Retomar ${r.nome}`} title={r.ativo ? "Pausar" : "Retomar"} className="w-8 h-8 rounded-md bg-tile text-fg-2 hover:text-fg flex items-center justify-center flex-shrink-0">
          {r.ativo
            ? <Pause size={14} strokeWidth={ICON_STROKE} aria-hidden />
            : <Play size={14} strokeWidth={ICON_STROKE} aria-hidden />}
        </button>
      </div>
    );
  }

  // Desktop: gastos fixos à esquerda; renda fixa e dívidas à direita.
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
      <div className="lg:row-span-2">
        <SectionTitle action={<SmallButton tone="blue" onClick={() => exigirConta("adicionar") && setRecEdit({ tipo: "saida" })}>+ Fixo</SmallButton>}>
          Gastos fixos · {formatBRL(fixosMensais(recorrentes))}/mês
        </SectionTitle>
        {saidas.length === 0 ? (
          <EmptyHint icon={Repeat} title="Nenhum gasto fixo">Aluguel, internet, assinaturas, passagem… Cadastre uma vez e eles viram contas no deck todo mês.</EmptyHint>
        ) : (
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">{saidas.map(r => <RecRow key={r.id} r={r} />)}</div>
        )}
      </div>

      <div>
        <SectionTitle action={<SmallButton tone="green" onClick={() => exigirConta("adicionar") && setRecEdit({ tipo: "entrada", categoria: "renda" })}>+ Renda</SmallButton>}>
          Renda fixa · {formatBRL(rendaMensal(recorrentes))}/mês
        </SectionTitle>
        {entradas.length === 0 ? (
          <p className="text-[12px] text-fg-3 px-1">Cadastre salário e outras entradas que se repetem — o Painel usa isso pra projeção.</p>
        ) : (
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">{entradas.map(r => <RecRow key={r.id} r={r} />)}</div>
        )}
      </div>

      <div>
        <SectionTitle action={<SmallButton tone="blue" onClick={() => exigirConta("adicionar") && setDivEdit({})}>+ Dívida</SmallButton>}>
          Dívidas · {formatBRL(ativas.reduce((a, d) => a + d.saldoDevedor, 0))}
        </SectionTitle>
        {ativas.length === 0 && quitadas.length === 0 && (
          <EmptyHint icon={CreditCard} title="Nenhuma dívida cadastrada">Cartão, empréstimo, financiamento… Com saldo, parcela e juros dá pra estimar quando cada uma acaba.</EmptyHint>
        )}
        <div className="flex flex-col gap-2">
          {[...ativas].sort((a, b) => (b.jurosMes || 0) - (a.jurosMes || 0)).map(d => {
            const n = parcelasRestantes(d);
            const alto = jurosAlto(d);
            return (
              <button key={d.id} type="button" onClick={() => setDivEdit(d)} className={`text-left rounded-lg border p-4 transition ${alto ? "border-line bg-surface" : "border-line bg-surface hover:bg-tile"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">{d.nome}</p>
                    <p className="text-[12px] text-fg-2 truncate">{d.credor || "—"} · vence dia {d.diaVencimento}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-fg tabular-nums">{formatBRL(d.saldoDevedor)}</p>
                    <p className="text-[12px] text-fg-2 tabular-nums">{formatBRL(d.parcela)}/mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-sm inline-flex items-center gap-1 ${alto ? "bg-neg/10 text-neg" : "bg-tile text-fg-2"}`}>{alto && <TriangleAlert size={12} strokeWidth={ICON_STROKE} aria-hidden />}{String(d.jurosMes || 0).replace(".", ",")}% a.m.</span>
                  <span className={`text-[12px] ${n === Infinity ? "text-neg" : "text-fg-2"}`}>
                    {n === Infinity ? "A parcela não cobre os juros — essa dívida só cresce" : `≈ ${n} ${n === 1 ? "parcela restante" : "parcelas restantes"}`}
                  </span>
                </div>
                {alto && n !== Infinity && <p className="text-[12px] text-neg mt-1.5">Juros de {JUROS_ALTO_MES}% a.m. ou mais: priorize quitar ou renegociar esta.</p>}
              </button>
            );
          })}
          {quitadas.map(d => (
            <button key={d.id} type="button" onClick={() => setDivEdit(d)} className="text-left rounded-lg border border-line bg-surface px-4 py-3 flex items-center justify-between">
              <span className="text-[13px] text-fg">{d.nome}</span><span className="text-[12px] text-pos">Quitada</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {recEdit && (
          <RecorrenteSheet key="rec" rec={recEdit} categorias={categorias} onClose={() => setRecEdit(null)}
            onSave={r => { finance.salvarRecorrente(r); setRecEdit(null); showToast(r.id ? "Fixo atualizado" : "Fixo criado", "bg-emerald-600/90"); }}
            onDelete={recEdit.id ? () => {
              if (!window.confirm(`Excluir "${recEdit.nome}"? As próximas ocorrências somem; o que já foi pago fica no extrato.`)) return;
              finance.removerRecorrente(recEdit.id); setRecEdit(null);
            } : null} />
        )}
        {divEdit && (
          <DividaSheet key="div" divida={divEdit} onClose={() => setDivEdit(null)}
            onSave={d => { finance.salvarDivida(d); setDivEdit(null); showToast(d.id ? "Dívida atualizada" : "Dívida cadastrada", "bg-emerald-600/90"); }}
            onDelete={divEdit.id ? () => {
              if (!window.confirm(`Excluir a dívida "${divEdit.nome}"? As parcelas futuras somem; as pagas ficam no extrato.`)) return;
              finance.removerDivida(divEdit.id); setDivEdit(null);
            } : null} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RecorrenteSheet({ rec, categorias, onClose, onSave, onDelete }) {
  const entrada = rec.tipo === "entrada";
  const [f, setF] = useState({
    nome: rec.nome || "", valor: rec.valor || 0, categoria: rec.categoria || (entrada ? "renda" : "casa"),
    frequencia: rec.frequencia || "mensal", dia: rec.dia || new Date().getDate(), diaSemana: rec.diaSemana ?? new Date().getDay(),
  });
  const [erro, setErro] = useState("");
  function salvar() {
    if (!f.nome.trim()) return setErro("Dê um nome.");
    if (f.valor <= 0) return setErro("Informe o valor.");
    onSave({ ...rec, ...f, nome: f.nome.trim(), dia: Number(f.dia), diaSemana: Number(f.diaSemana), ativo: rec.ativo ?? true, inicio: rec.inicio || todayKey() });
  }
  return (
    <Sheet title={rec.id ? (entrada ? "Editar renda fixa" : "Editar gasto fixo") : (entrada ? "Nova renda fixa" : "Novo gasto fixo")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="r-nome">Nome</label><input id="r-nome" value={f.nome} maxLength={40} onChange={e => setF(p => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder={entrada ? "Ex: Salário" : "Ex: Internet"} /></div>
        <div><label className={labelCls} htmlFor="r-valor">Valor</label><MoneyInput id="r-valor" value={f.valor} onChange={valor => setF(p => ({ ...p, valor }))} className={`${inputCls} text-lg font-bold`} /></div>
        <div><label className={labelCls} htmlFor="r-cat">Categoria</label>
          <select id="r-cat" value={f.categoria} onChange={e => setF(p => ({ ...p, categoria: e.target.value }))} className={`${inputCls} bg-surface`}>
            {categorias.filter(c => c.id !== (entrada ? "dividas" : "renda")).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <p className={labelCls}>Frequência</p>
          <div className="flex gap-2 mb-2">
            {[{ id: "mensal", l: "Mensal" }, { id: "semanal", l: "Semanal" }].map(o => (
              <button key={o.id} type="button" aria-pressed={f.frequencia === o.id} onClick={() => setF(p => ({ ...p, frequencia: o.id }))} className={`flex-1 py-2 rounded-md text-[13px] border transition ${f.frequencia === o.id ? "bg-brand/[0.06] border-brand/40 text-brand-ink" : "bg-surface border-line text-fg-2"}`}>{o.l}</button>
            ))}
          </div>
          {f.frequencia === "mensal" ? (
            <label className="flex items-center gap-2 text-[13px] text-fg-2">Todo dia
              <input type="number" min={1} max={31} value={f.dia} onChange={e => setF(p => ({ ...p, dia: Math.max(1, Math.min(31, Number(e.target.value) || 1)) }))} className="w-20 rounded-md border border-line bg-tile px-3 py-2 text-fg" aria-label="Dia do mês" />
            </label>
          ) : (
            <select aria-label="Dia da semana" value={f.diaSemana} onChange={e => setF(p => ({ ...p, diaSemana: Number(e.target.value) }))} className={`${inputCls} bg-surface`}>
              {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          )}
        </div>
        {erro && <p className="text-[12px] text-neg">{erro}</p>}
        {rec.id && <p className="text-[12px] text-fg-3">Mudanças valem de hoje em diante; o que já foi pago não muda.</p>}
        <button type="button" onClick={salvar} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition">Salvar</button>
        {onDelete && <button type="button" onClick={onDelete} className="w-full rounded-md border border-line bg-surface py-2.5 text-[13px] font-medium text-neg hover:bg-tile transition">Excluir</button>}
      </div>
    </Sheet>
  );
}

function DividaSheet({ divida, onClose, onSave, onDelete }) {
  const [f, setF] = useState({
    nome: divida.nome || "", credor: divida.credor || "", saldoDevedor: divida.saldoDevedor || 0,
    parcela: divida.parcela || 0, jurosMes: divida.jurosMes != null ? String(divida.jurosMes).replace(".", ",") : "", diaVencimento: divida.diaVencimento || 10,
  });
  const [erro, setErro] = useState("");
  const juros = Number(String(f.jurosMes).replace(",", ".")) || 0;
  const n = parcelasRestantes({ saldoDevedor: f.saldoDevedor, parcela: f.parcela, jurosMes: juros });
  function salvar() {
    if (!f.nome.trim()) return setErro("Dê um nome.");
    if (f.saldoDevedor < 0 || f.parcela <= 0) return setErro("Informe saldo devedor e parcela.");
    if (juros < 0 || juros > 100) return setErro("Juros ao mês entre 0 e 100%.");
    onSave({ ...(divida.id ? { id: divida.id } : {}), nome: f.nome.trim(), credor: f.credor.trim(), saldoDevedor: f.saldoDevedor, parcela: f.parcela, jurosMes: juros, diaVencimento: Number(f.diaVencimento) });
  }
  return (
    <Sheet title={divida.id ? "Editar dívida" : "Nova dívida"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls} htmlFor="d-nome">Nome</label><input id="d-nome" value={f.nome} maxLength={40} onChange={e => setF(p => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder="Ex: Cartão" /></div>
          <div><label className={labelCls} htmlFor="d-credor">Credor</label><input id="d-credor" value={f.credor} maxLength={40} onChange={e => setF(p => ({ ...p, credor: e.target.value }))} className={inputCls} placeholder="Ex: Banco X" /></div>
        </div>
        <div><label className={labelCls} htmlFor="d-saldo">Saldo devedor</label><MoneyInput id="d-saldo" value={f.saldoDevedor} onChange={v => setF(p => ({ ...p, saldoDevedor: v }))} className={`${inputCls} text-lg font-bold`} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls} htmlFor="d-parc">Parcela</label><MoneyInput id="d-parc" value={f.parcela} onChange={v => setF(p => ({ ...p, parcela: v }))} className={inputCls} /></div>
          <div><label className={labelCls} htmlFor="d-juros">Juros % a.m.</label><input id="d-juros" inputMode="decimal" value={f.jurosMes} onChange={e => setF(p => ({ ...p, jurosMes: e.target.value.replace(/[^\d,.]/g, "") }))} className={inputCls} placeholder="Ex: 2,5" /></div>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fg-2">Vence todo dia
          <input type="number" min={1} max={31} value={f.diaVencimento} onChange={e => setF(p => ({ ...p, diaVencimento: Math.max(1, Math.min(31, Number(e.target.value) || 1)) }))} className="w-20 rounded-md border border-line bg-tile px-3 py-2 text-fg" aria-label="Dia do vencimento" />
        </label>
        {f.saldoDevedor > 0 && f.parcela > 0 && (
          <p className={`text-[12px] ${n === Infinity ? "text-neg" : "text-fg-2"}`}>
            {n === Infinity ? "Com essa parcela os juros ganham — a dívida nunca acaba." : `Estimativa: ${n} ${n === 1 ? "parcela" : "parcelas"} (≈ ${formatBRL(f.parcela * n)} no total).`}
          </p>
        )}
        {erro && <p className="text-[12px] text-neg">{erro}</p>}
        <button type="button" onClick={salvar} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition">Salvar</button>
        {onDelete && <button type="button" onClick={onDelete} className="w-full rounded-md border border-line bg-surface py-2.5 text-[13px] font-medium text-neg hover:bg-tile transition">Excluir</button>}
      </div>
    </Sheet>
  );
}
