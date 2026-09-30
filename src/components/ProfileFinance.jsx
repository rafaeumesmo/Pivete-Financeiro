import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, ProgressBar, inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { CONQUISTAS } from "../lib/conquistas.js";
import { DEFAULT_CATEGORIAS, EXTRA_CATEGORY_STYLES } from "../lib/categories.js";
import { makeId } from "../lib/finance.js";

const card = "rounded-2xl border border-white/[0.07] bg-white/[0.03]";

export function ContasSection({ finance, showToast, ocultar = false }) {
  const { contas } = finance;
  const [edit, setEdit] = useState(null);
  const total = contas.reduce((a, c) => a + c.saldo, 0);
  return (
    <div>
      <SectionTitle action={<SmallButton tone="blue" onClick={() => setEdit({})}>+ Conta</SmallButton>}>Contas · {formatBRL(total, { oculto: ocultar })}</SectionTitle>
      <div className={`${card} divide-y divide-white/[0.05]`}>
        {contas.map(c => (
          <button key={c.id} type="button" onClick={() => setEdit(c)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition">
            <span className="text-[13px] text-white">🏦 {c.nome}</span>
            <span className={`text-[13px] font-semibold tabular-nums ${c.saldo < 0 && !ocultar ? "text-red-400" : "text-white"}`}>{formatBRL(c.saldo, { oculto: ocultar })}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {edit && (
          <ContaSheet key="conta" conta={edit} podeExcluir={contas.length > 1} onClose={() => setEdit(null)}
            onSave={c => { finance.salvarConta(c); setEdit(null); showToast(c.id ? "Conta atualizada" : "Conta criada", "bg-emerald-600/90"); }}
            onDelete={() => { if (window.confirm(`Excluir a conta "${edit.nome}"? O histórico continua no extrato.`) && finance.removerConta(edit.id)) setEdit(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ContaSheet({ conta, podeExcluir, onClose, onSave, onDelete }) {
  const [nome, setNome] = useState(conta.nome || "");
  const [saldo, setSaldo] = useState(Math.abs(conta.saldo || 0));
  const [negativo, setNegativo] = useState((conta.saldo || 0) < 0);
  return (
    <Sheet title={conta.id ? "Editar conta" : "Nova conta"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="c-nome">Nome</label><input id="c-nome" value={nome} maxLength={30} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Poupança, Dinheiro, Nubank" /></div>
        <div>
          <label className={labelCls} htmlFor="c-saldo">Saldo atual</label>
          <MoneyInput id="c-saldo" value={saldo} onChange={setSaldo} className={`${inputCls} text-lg font-bold ${negativo ? "text-red-400" : ""}`} />
          <label className="flex items-center gap-2 mt-2 text-[12px] text-white/45"><input type="checkbox" checked={negativo} onChange={e => setNegativo(e.target.checked)} className="accent-red-500" /> Saldo negativo (cheque especial)</label>
          {conta.id && <p className="text-[11px] text-white/30 mt-1.5">Ajustar o saldo aqui não cria lançamento — use pra corrigir com o extrato do banco.</p>}
        </div>
        <button type="button" disabled={!nome.trim()} onClick={() => onSave({ ...(conta.id ? { id: conta.id } : {}), nome: nome.trim(), saldo: negativo ? -saldo : saldo })} className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40">Salvar</button>
        {conta.id && podeExcluir && <button type="button" onClick={onDelete} className="w-full rounded-2xl border border-red-500/25 bg-red-500/10 py-2.5 text-[13px] text-red-300 hover:bg-red-500/20 transition">Excluir conta</button>}
      </div>
    </Sheet>
  );
}

export function ReservaSection({ custo, reserva, reservaMeses, setReservaMeses, temCaixinhaReserva, onCriarCaixinha, ocultar = false }) {
  const o = { oculto: ocultar };
  const alvo = custo * reservaMeses;
  const meses = custo > 0 ? reserva / custo : 0;
  return (
    <div>
      <SectionTitle>Reserva de emergência</SectionTitle>
      <div className={`${card} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-white/50">Meta</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Meses de reserva">
            {[3, 6, 12].map(n => (
              <button key={n} type="button" role="radio" aria-checked={reservaMeses === n} onClick={() => setReservaMeses(n)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${reservaMeses === n ? "bg-[#2563eb]/25 border-[#2563eb]/50 text-blue-200" : "bg-white/[0.05] border-white/10 text-white/40"}`}>{n} meses</button>
            ))}
          </div>
        </div>
        {custo === 0 ? (
          <p className="text-[12px] text-white/35">Cadastre seus gastos fixos pra calcular o custo de vida mensal.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-lg font-bold text-white tabular-nums">{formatBRL(reserva, o)}</p>
              <p className="text-[12px] text-white/40 tabular-nums">de {formatBRL(alvo, o)}</p>
            </div>
            <ProgressBar pct={alvo ? (reserva / alvo) * 100 : 0} color={reserva >= alvo ? "#10b981" : "#2563eb"} label="Reserva de emergência" />
            <p className="text-[12px] text-white/45 mt-2">
              Cobre <strong className="text-white">{meses.toFixed(1).replace(".", ",")} {meses < 2 ? "mês" : "meses"}</strong> do seu custo de {formatBRL(custo, o)}/mês (fixos + parcelas + variável médio).
            </p>
            <p className="text-[11px] text-white/30 mt-1">Reserva = soma das caixinhas.</p>
            {!temCaixinhaReserva && <SmallButton tone="blue" className="mt-3" onClick={() => onCriarCaixinha(alvo)}>Criar caixinha "Reserva de emergência"</SmallButton>}
          </>
        )}
      </div>
    </div>
  );
}

export function ConquistasSection({ desbloqueadas }) {
  const n = CONQUISTAS.filter(q => desbloqueadas[q.id]).length;
  return (
    <div>
      <SectionTitle>Conquistas · {n}/{CONQUISTAS.length}</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {CONQUISTAS.map(q => {
          const ok = !!desbloqueadas[q.id];
          return (
            <div key={q.id} className={`rounded-2xl border px-3 py-3 ${ok ? "border-amber-400/30 bg-amber-400/[0.07]" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xl ${ok ? "" : "grayscale opacity-30"}`} aria-hidden>{q.icon}</span>
                <span className={`text-[12px] font-semibold leading-tight ${ok ? "text-white" : "text-white/40"}`}>{q.nome}</span>
              </div>
              <p className="text-[10.5px] text-white/35 leading-snug">{q.desc}</p>
              <p className={`text-[10px] font-semibold mt-1 ${ok ? "text-amber-300" : "text-white/25"}`}>{ok ? "✓ " : "🔒 "}+{q.xp} XP</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CategoriasSection({ finance, showToast }) {
  const { categorias } = finance;
  const [edit, setEdit] = useState(null);
  const padrao = new Set(DEFAULT_CATEGORIAS.map(c => c.id));
  function salvar(c) {
    if (c.id) finance.setCategorias(prev => prev.map(x => x.id === c.id ? { ...x, nome: c.nome, icon: c.icon } : x));
    else {
      const extras = categorias.filter(x => !padrao.has(x.id)).length;
      finance.setCategorias(prev => [...prev, { id: makeId("cat"), nome: c.nome, icon: c.icon, ...EXTRA_CATEGORY_STYLES[extras % EXTRA_CATEGORY_STYLES.length] }]);
    }
    setEdit(null);
    showToast("Categoria salva", "bg-emerald-600/90");
  }
  function excluir(c) {
    if (!window.confirm(`Excluir a categoria "${c.nome}"? Lançamentos dela passam a aparecer como Outros.`)) return;
    finance.setCategorias(prev => prev.filter(x => x.id !== c.id));
    setEdit(null);
  }
  return (
    <div>
      <SectionTitle action={<SmallButton tone="blue" onClick={() => setEdit({})}>+ Categoria</SmallButton>}>Categorias</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {categorias.map(c => (
          <button key={c.id} type="button" onClick={() => setEdit(c)} className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.08] transition">
            <span className="w-2 h-2 rounded-full" style={{ background: c.cor }} aria-hidden />{c.icon} {c.nome}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {edit && (
          <CategoriaSheet key="cat" categoria={edit} onClose={() => setEdit(null)} onSave={salvar}
            onDelete={edit.id && !padrao.has(edit.id) ? () => excluir(edit) : null} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoriaSheet({ categoria, onClose, onSave, onDelete }) {
  const [nome, setNome] = useState(categoria.nome || "");
  const [icon, setIcon] = useState(categoria.icon || "🏷️");
  return (
    <Sheet title={categoria.id ? "Editar categoria" : "Nova categoria"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[72px_1fr] gap-2">
          <div><label className={labelCls} htmlFor="cat-icon">Ícone</label><input id="cat-icon" value={icon} maxLength={4} onChange={e => setIcon(e.target.value)} className={`${inputCls} text-center text-lg px-2`} /></div>
          <div><label className={labelCls} htmlFor="cat-nome">Nome</label><input id="cat-nome" value={nome} maxLength={20} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Saúde, Pets" /></div>
        </div>
        <button type="button" disabled={!nome.trim()} onClick={() => onSave({ ...(categoria.id ? { id: categoria.id } : {}), nome: nome.trim(), icon: icon.trim() || "🏷️" })} className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40">Salvar</button>
        {onDelete && <button type="button" onClick={onDelete} className="w-full rounded-2xl border border-red-500/25 bg-red-500/10 py-2.5 text-[13px] text-red-300 hover:bg-red-500/20 transition">Excluir categoria</button>}
        {categoria.id && !onDelete && <p className="text-[11px] text-white/30 text-center">Categorias padrão podem ser renomeadas, mas não excluídas.</p>}
      </div>
    </Sheet>
  );
}
