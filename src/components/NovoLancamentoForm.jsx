import { useState } from "react";
import { motion } from "framer-motion";
import { MoneyInput } from "./MoneyInput.jsx";
import { formatBRL, splitCents } from "../lib/money.js";
import { todayKey, fromDateStr } from "../lib/dates.js";
import { diaSemanaLabel } from "../lib/finance.js";

const label = "block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2";
const field = "w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition";

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
          <div><p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Registrar</p><h2 className={`font-bold text-white ${isDesktop ? "text-xl" : "text-lg"}`}>Novo lançamento</h2></div>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar</button>
        </div>

        <form onSubmit={submit} className={isDesktop ? "rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col gap-5" : "flex flex-col gap-4"}>
          {/* Tipo */}
          <div className="flex bg-white/[0.05] border border-white/[0.07] p-1 rounded-2xl" role="radiogroup" aria-label="Tipo">
            {[{ id: "saida", label: "↓ Saída", on: "bg-red-500/20 text-red-300" }, { id: "entrada", label: "↑ Entrada", on: "bg-emerald-500/20 text-emerald-300" }].map(t => (
              <button key={t.id} type="button" role="radio" aria-checked={f.tipo === t.id} onClick={() => trocarTipo(t.id)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${f.tipo === t.id ? t.on : "text-white/40 hover:text-white/60"}`}>{t.label}</button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label htmlFor="valor" className={label}>{f.repetir === "parcelado" ? "Valor total" : "Valor"}</label>
            <MoneyInput id="valor" value={f.valor} onChange={valor => set({ valor })} className={`w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-4 text-3xl font-black outline-none focus:border-[#2563eb]/60 transition ${entrada ? "text-emerald-300" : "text-white"}`} />
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
                  className={`flex flex-col items-center gap-1 rounded-2xl border py-2.5 px-1 transition ${f.categoria === c.id ? "bg-white/[0.12] border-white/30" : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]"}`}
                  style={f.categoria === c.id ? { borderColor: c.cor } : undefined}>
                  <span className="text-xl leading-none">{c.icon}</span>
                  <span className={`text-[10px] font-medium leading-tight text-center ${f.categoria === c.id ? "text-white" : "text-white/45"}`}>{c.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="data" className={label.replace(" mb-2", "")}>{entrada ? "Data prevista" : "Vencimento"}</label>
              {!precisaData && (
                <label className="flex items-center gap-1.5 text-[11px] text-white/40 cursor-pointer">
                  <input type="checkbox" checked={f.semData} onChange={e => set({ semData: e.target.checked })} className="accent-[#2563eb]" /> Sem data definida
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
              {[{ id: "nao", label: "Uma vez" }, { id: "recorrente", label: "🔁 Fixo" }, ...(entrada ? [] : [{ id: "parcelado", label: "Parcelado" }])].map(o => (
                <button key={o.id} type="button" aria-pressed={f.repetir === o.id} onClick={() => set({ repetir: o.id, semData: o.id === "nao" ? f.semData : false })}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition border ${f.repetir === o.id ? "bg-white/[0.12] border-white/25 text-white" : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/60"}`}>{o.label}</button>
              ))}
            </div>
            {f.repetir === "recorrente" && dia && (
              <div className="mt-3 flex gap-2">
                {[{ id: "mensal", label: `Todo dia ${dia.getDate()}` }, { id: "semanal", label: diaSemanaLabel(dia.getDay()) }].map(o => (
                  <button key={o.id} type="button" aria-pressed={f.frequencia === o.id} onClick={() => set({ frequencia: o.id })}
                    className={`flex-1 py-2 rounded-xl text-[13px] transition border ${f.frequencia === o.id ? "bg-[#2563eb]/15 border-[#2563eb]/40 text-[#93c5fd]" : "bg-white/[0.03] border-white/[0.07] text-white/40"}`}>{o.label}</button>
                ))}
              </div>
            )}
            {f.repetir === "recorrente" && <p className="text-[11px] text-white/30 mt-2">Vira um lançamento pendente a cada ocorrência, a partir da data acima. Dá pra pausar ou editar em Atividade → Fixos & Dívidas.</p>}
            {f.repetir === "parcelado" && (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3">
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Menos parcelas" onClick={() => set({ parcelas: Math.max(2, f.parcelas - 1) })} className="w-8 h-8 rounded-xl bg-white/[0.08] text-white text-lg leading-none">−</button>
                  <span className="text-base font-bold text-white tabular-nums w-10 text-center">{f.parcelas}x</span>
                  <button type="button" aria-label="Mais parcelas" onClick={() => set({ parcelas: Math.min(48, f.parcelas + 1) })} className="w-8 h-8 rounded-xl bg-white/[0.08] text-white text-lg leading-none">+</button>
                </div>
                <span className="text-sm text-white/60 tabular-nums">{f.valor > 0 ? `${f.parcelas}x de ${formatBRL(parcelas[parcelas.length - 1])}` : "—"}</span>
              </div>
            )}
          </div>

          {/* Já pago */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-white/75">{entrada ? "Já recebi" : "Já paguei"}{f.repetir !== "nao" && <span className="text-white/35 text-[12px]"> (a 1ª)</span>}</span>
              <input type="checkbox" checked={f.pago} onChange={e => set({ pago: e.target.checked, semData: false })} className="w-5 h-5 accent-emerald-500" />
            </label>
            {f.pago && contas.length > 1 && (
              <select aria-label="Conta" value={f.contaId || ""} onChange={e => set({ contaId: e.target.value })} className="mt-3 w-full rounded-xl border border-white/[0.08] bg-[#18191f] px-3 py-2.5 text-sm text-white outline-none">
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome} · {formatBRL(c.saldo)}</option>)}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm text-white/50 hover:bg-white/[0.07] hover:text-white/70 transition">Cancelar</button>
            <button type="submit" className={`flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition ${entrada ? "bg-emerald-600 hover:bg-emerald-500" : "bg-[#2563eb] hover:bg-blue-500"}`}>Salvar</button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
