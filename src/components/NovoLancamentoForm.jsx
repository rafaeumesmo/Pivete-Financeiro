import { useState } from "react";
import { motion } from "framer-motion";
import { MoneyInput } from "./MoneyInput.jsx";
import { formatBRL, splitCents } from "../lib/money.js";
import { todayKey, fromDateStr } from "../lib/dates.js";
import { diaSemanaLabel } from "../lib/finance.js";
import { CategoryTile } from "./CategoryTile.jsx";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { btnCls } from "./ui.jsx";

const label = "block text-[12px] font-semibold text-fg-3 mb-2";
const field = "w-full rounded-lg border border-line bg-tile px-4 py-3 text-sm text-fg outline-none focus:border-brand placeholder:text-fg-3 transition";

function emptyForm(tipo = "saida") {
  return {
    tipo, valor: 0, categoria: tipo === "entrada" ? "renda" : "alimentacao", descricao: "",
    data: todayKey(), semData: false, repetir: "nao", // "nao" | "recorrente" | "parcelado"
    frequencia: "mensal", parcelas: 2, pago: false, contaId: null,
  };
}

// Tela "Novo lançamento" — compartilhada entre mobile e desktop (só o
// wrapper muda). Monta um objeto e entrega pro onSubmit; quem grava é
// useFinance.criarLancamento.
export function NovoLancamentoForm({ isDesktop, categorias, contas, contaPadrao, onCancel, onSubmit, showToast }) {
  const [f, setF] = useState(() => ({ ...emptyForm(), contaId: contaPadrao || contas[0]?.id || null }));
  const set = (patch) => setF(p => ({ ...p, ...patch }));
  const entrada = f.tipo === "entrada";
  const cats = categorias.filter(c => c.id !== (entrada ? "dividas" : "renda"));
  const dia = f.data ? fromDateStr(f.data) : null;
  const parcelas = f.repetir === "parcelado" ? splitCents(f.valor, f.parcelas) : null;
  const precisaData = f.repetir !== "nao" || f.pago;

  function trocarTipo(tipo) {
    if (tipo === f.tipo) return;
    setF(p => ({ ...p, tipo, categoria: tipo === "entrada" ? "renda" : "alimentacao", repetir: p.repetir === "parcelado" ? "nao" : p.repetir }));
  }

  function submit(e) {
    e.preventDefault();
    if (f.valor <= 0) { showToast("Informe o valor.", "bg-red-600/90"); return; }
    if (precisaData && (f.semData || !f.data)) { showToast("Escolha uma data.", "bg-red-600/90"); return; }
    const categoria = categorias.find(c => c.id === f.categoria);
    onSubmit({
      tipo: f.tipo,
      valor: f.valor,
      categoria: f.categoria,
      descricao: f.descricao.trim() || categoria?.nome || (entrada ? "Entrada" : "Gasto"),
      data: f.semData && !precisaData ? null : f.data,
      recorrente: f.repetir === "recorrente" ? { frequencia: f.frequencia, dia: dia.getDate(), diaSemana: dia.getDay() } : null,
      parcelas: f.repetir === "parcelado" ? f.parcelas : null,
      pago: f.pago,
      contaId: f.contaId,
    });
    setF({ ...emptyForm(f.tipo), contaId: f.contaId });
  }

  return (
    <motion.div className={isDesktop ? "h-full overflow-y-auto px-10 py-10" : "h-full overflow-y-auto px-5 pt-4 pb-6"} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className={isDesktop ? "max-w-xl mx-auto" : undefined}>
        <div className={`flex items-center justify-between ${isDesktop ? "mb-6" : "mb-5"}`}>
          <h2 className={`font-semibold text-fg ${isDesktop ? "text-2xl" : "text-xl"}`}>Novo lançamento</h2>
          <button onClick={onCancel} className={`${btnCls.ghost} px-2.5 py-1.5 text-[13px]`}><ChevronLeft size={16} strokeWidth={ICON_STROKE} aria-hidden />Voltar</button>
        </div>

        <form onSubmit={submit} className={isDesktop ? "rounded-lg bg-surface border border-line p-6 flex flex-col gap-5" : "flex flex-col gap-4"}>
          {/* Tipo */}
          <div className="flex bg-tile p-1 rounded-md" role="radiogroup" aria-label="Tipo">
            {[{ id: "saida", label: "Saída" }, { id: "entrada", label: "Entrada" }].map(t => (
              <button key={t.id} type="button" role="radio" aria-checked={f.tipo === t.id} onClick={() => trocarTipo(t.id)} className={`flex-1 py-2 rounded-sm text-sm font-medium transition ${f.tipo === t.id ? "bg-surface text-fg shadow" : "text-fg-2 hover:text-fg"}`}>{t.label}</button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label htmlFor="valor" className={label}>{f.repetir === "parcelado" ? "Valor total" : "Valor"}</label>
            <MoneyInput id="valor" value={f.valor} onChange={valor => set({ valor })} className={`w-full rounded-md border border-line bg-surface px-4 py-4 text-3xl font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition ${entrada ? "text-pos" : "text-fg"}`} />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="descricao" className={label}>Descrição</label>
            <input id="descricao" value={f.descricao} onChange={e => set({ descricao: e.target.value })} maxLength={60} className={field} placeholder={entrada ? "Ex: Salário, freela…" : "Ex: Mercado, conta de luz…"} />
          </div>

          {/* Categoria */}
          <div>
            <p className={label}>Categoria</p>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Categoria">
              {cats.map(c => (
                <button key={c.id} type="button" role="radio" aria-checked={f.categoria === c.id} onClick={() => set({ categoria: c.id })}
                  className={`flex flex-col items-center gap-1.5 rounded-md border py-2.5 px-1 transition ${f.categoria === c.id ? "border-brand bg-brand/[0.06]" : "bg-surface border-line hover:bg-tile"}`}>
                  <CategoryTile categoria={c} size={32} />
                  <span className={`text-[12px] font-medium leading-tight text-center ${f.categoria === c.id ? "text-fg" : "text-fg-2"}`}>{c.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="data" className={label.replace(" mb-2", "")}>{entrada ? "Data prevista" : "Vencimento"}</label>
              {!precisaData && (
                <label className="flex items-center gap-1.5 text-[12px] text-fg-2 cursor-pointer">
                  <input type="checkbox" checked={f.semData} onChange={e => set({ semData: e.target.checked })} className="accent-brand" /> Sem data definida
                </label>
              )}
            </div>
            {!(f.semData && !precisaData) && (
              <input id="data" type="date" value={f.data} onChange={e => set({ data: e.target.value })} className={`${field} [color-scheme:dark]`} />
            )}
          </div>

          {/* Repetição */}
          <div>
            <p className={label}>Repetir</p>
            <div className="flex gap-2">
              {[{ id: "nao", label: "Uma vez" }, { id: "recorrente", label: "Fixo" }, ...(entrada ? [] : [{ id: "parcelado", label: "Parcelado" }])].map(o => (
                <button key={o.id} type="button" aria-pressed={f.repetir === o.id} onClick={() => set({ repetir: o.id, semData: o.id === "nao" ? f.semData : false })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border ${f.repetir === o.id ? "bg-tile border-line text-fg" : "bg-surface border-line text-fg-2 hover:text-fg-2"}`}>{o.label}</button>
              ))}
            </div>
            {f.repetir === "recorrente" && dia && (
              <div className="mt-3 flex gap-2">
                {[{ id: "mensal", label: `Todo dia ${dia.getDate()}` }, { id: "semanal", label: diaSemanaLabel(dia.getDay()) }].map(o => (
                  <button key={o.id} type="button" aria-pressed={f.frequencia === o.id} onClick={() => set({ frequencia: o.id })}
                    className={`flex-1 py-2 rounded-md text-[13px] transition border ${f.frequencia === o.id ? "bg-brand/[0.06] border-brand text-brand-ink" : "bg-surface border-line text-fg-2"}`}>{o.label}</button>
                ))}
              </div>
            )}
            {f.repetir === "recorrente" && <p className="text-[12px] text-fg-3 mt-2">Vira um lançamento pendente a cada ocorrência, a partir da data acima. Dá pra pausar ou editar em Atividade → Fixos & Dívidas.</p>}
            {f.repetir === "parcelado" && (
              <div className="mt-3 flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Menos parcelas" onClick={() => set({ parcelas: Math.max(2, f.parcelas - 1) })} className="w-8 h-8 rounded-md border border-line bg-surface text-fg flex items-center justify-center hover:bg-tile"><Minus size={16} strokeWidth={ICON_STROKE} aria-hidden /></button>
                  <span className="text-base font-bold text-fg tabular-nums w-10 text-center">{f.parcelas}x</span>
                  <button type="button" aria-label="Mais parcelas" onClick={() => set({ parcelas: Math.min(48, f.parcelas + 1) })} className="w-8 h-8 rounded-md border border-line bg-surface text-fg flex items-center justify-center hover:bg-tile"><Plus size={16} strokeWidth={ICON_STROKE} aria-hidden /></button>
                </div>
                <span className="text-sm text-fg-2 tabular-nums">{f.valor > 0 ? `${f.parcelas}x de ${formatBRL(parcelas[parcelas.length - 1])}` : "—"}</span>
              </div>
            )}
          </div>

          {/* Já pago */}
          <div className="rounded-lg bg-surface border border-line px-4 py-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-fg">{entrada ? "Já recebi" : "Já paguei"}{f.repetir !== "nao" && <span className="text-fg-3 text-[12px]"> (a 1ª)</span>}</span>
              <input type="checkbox" checked={f.pago} onChange={e => set({ pago: e.target.checked, semData: false })} className="w-5 h-5 accent-brand" />
            </label>
            {f.pago && contas.length > 1 && (
              <select aria-label="Conta" value={f.contaId || ""} onChange={e => set({ contaId: e.target.value })} className="mt-3 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none">
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome} · {formatBRL(c.saldo)}</option>)}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-line bg-tile py-3 text-sm text-fg-2 hover:bg-tile hover:text-fg transition">Cancelar</button>
            <button type="submit" className={`flex-1 rounded-lg py-3 text-sm font-semibold text-on-brand transition ${entrada ? "bg-brand hover:bg-brand-hover" : "bg-brand hover:bg-brand-hover"}`}>Salvar</button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
