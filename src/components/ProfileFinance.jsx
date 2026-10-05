import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, ProgressBar, inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { CONQUISTAS } from "../lib/conquistas.js";
import { DEFAULT_CATEGORIAS, EXTRA_CATEGORY_STYLES } from "../lib/categories.js";
import { makeId } from "../lib/finance.js";
import { Landmark, Lock, Trophy } from "lucide-react";
import { ICONS, ICON_STROKE, categoriaIcon, conquistaIcons } from "../lib/icons.js";
import { CategoryTile } from "./CategoryTile.jsx";
import { btnCls } from "./ui.jsx";

// Chave do ícone atual (iconKey salvo, ou a do ícone padrão da categoria).
function iconKeyDe(categoria) {
  if (categoria.iconKey && ICONS[categoria.iconKey]) return categoria.iconKey;
  const atual = categoriaIcon(categoria);
  return Object.keys(ICONS).find(k => ICONS[k] === atual) || "tag";
}

const card = "rounded-lg border border-line bg-surface";

export function ContasSection({ finance, showToast, ocultar = false }) {
  const { contas } = finance;
  const [edit, setEdit] = useState(null);
  const total = contas.reduce((a, c) => a + c.saldo, 0);
  return (
    <div>
      <SectionTitle action={<SmallButton tone="blue" onClick={() => setEdit({})}>+ Conta</SmallButton>}>Contas · {formatBRL(total, { oculto: ocultar })}</SectionTitle>
      <div className={`${card} divide-y divide-line`}>
        {contas.map(c => (
          <button key={c.id} type="button" onClick={() => setEdit(c)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-tile transition">
            <span className="flex items-center gap-3 text-[13px] text-fg"><span className="w-8 h-8 rounded-md bg-tile flex items-center justify-center" aria-hidden><Landmark size={16} strokeWidth={ICON_STROKE} /></span>{c.nome}</span>
            <span className={`text-[13px] font-semibold tabular-nums ${c.saldo < 0 && !ocultar ? "text-neg" : "text-fg"}`}>{formatBRL(c.saldo, { oculto: ocultar })}</span>
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
          <MoneyInput id="c-saldo" value={saldo} onChange={setSaldo} className={`${inputCls} text-lg font-bold ${negativo ? "text-neg" : ""}`} />
          <label className="flex items-center gap-2 mt-2 text-[12px] lg:text-[13px] text-fg-2"><input type="checkbox" checked={negativo} onChange={e => setNegativo(e.target.checked)} className="accent-brand" /> Saldo negativo (cheque especial)</label>
          {conta.id && <p className="text-[12px] lg:text-[13px] text-fg-3 mt-1.5">Ajustar o saldo aqui não cria lançamento — use pra corrigir com o extrato do banco.</p>}
        </div>
        <button type="button" disabled={!nome.trim()} onClick={() => onSave({ ...(conta.id ? { id: conta.id } : {}), nome: nome.trim(), saldo: negativo ? -saldo : saldo })} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-40">Salvar</button>
        {conta.id && podeExcluir && <button type="button" onClick={onDelete} className="w-full rounded-lg border border-neg/30 bg-neg/10 py-2.5 text-[13px] text-neg hover:bg-neg/10 transition">Excluir conta</button>}
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
          <span className="text-[13px] text-fg-2">Meta</span>
          <div className="inline-flex p-0.5 rounded-md bg-tile" role="radiogroup" aria-label="Meses de reserva">
            {[3, 6, 12].map(n => (
              <button key={n} type="button" role="radio" aria-checked={reservaMeses === n} onClick={() => setReservaMeses(n)} className={`text-[12px] lg:text-[13px] font-medium px-2.5 py-1 rounded-sm transition ${reservaMeses === n ? "bg-surface text-fg shadow" : "text-fg-2 hover:text-fg"}`}>{n} meses</button>
            ))}
          </div>
        </div>
        {custo === 0 ? (
          <p className="text-[12px] lg:text-[13px] text-fg-3">Cadastre seus gastos fixos pra calcular o custo de vida mensal.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-lg font-bold text-fg tabular-nums">{formatBRL(reserva, o)}</p>
              <p className="text-[12px] lg:text-[13px] text-fg-2 tabular-nums">de {formatBRL(alvo, o)}</p>
            </div>
            <ProgressBar pct={alvo ? (reserva / alvo) * 100 : 0} color={reserva >= alvo ? "rgb(var(--pos))" : "rgb(var(--brand))"} label="Reserva de emergência" />
            <p className="text-[12px] lg:text-[13px] text-fg-2 mt-2">
              Cobre <strong className="text-fg">{meses.toFixed(1).replace(".", ",")} {meses < 2 ? "mês" : "meses"}</strong> do seu custo de {formatBRL(custo, o)}/mês (fixos + parcelas + variável médio).
            </p>
            <p className="text-[12px] lg:text-[13px] text-fg-3 mt-1">Reserva = soma das caixinhas.</p>
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
      {/* Ocupa toda a largura do pai: 2 colunas até o desktop, 3 a partir dele. */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
        {CONQUISTAS.map(q => {
          const ok = !!desbloqueadas[q.id];
          const Icone = conquistaIcons[q.id] || Trophy;
          return (
            <div key={q.id} className="rounded-lg border border-line bg-surface px-3 py-3 lg:px-4 lg:py-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${ok ? "bg-tile text-fg" : "bg-tile text-fg-3"}`} aria-hidden>
                  {ok ? <Icone size={16} strokeWidth={ICON_STROKE} /> : <Lock size={14} strokeWidth={ICON_STROKE} />}
                </span>
                <span className={`text-[13px] lg:text-[15px] font-semibold leading-tight ${ok ? "text-fg" : "text-fg-2"}`}>{q.nome}</span>
              </div>
              <p className="text-[12px] lg:text-[14px] text-fg-2 leading-snug">{q.desc}</p>
              <p className={`text-[12px] lg:text-[13px] font-medium mt-1 lg:mt-2 ${ok ? "text-fg" : "text-fg-3"}`}>+{q.xp} XP{ok ? "" : " · bloqueada"}</p>
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
    // Só acrescenta iconKey: o campo `icon` antigo fica como está pra versões
    // anteriores do app em outros aparelhos.
    if (c.id) finance.setCategorias(prev => prev.map(x => x.id === c.id ? { ...x, nome: c.nome, iconKey: c.iconKey } : x));
    else {
      const extras = categorias.filter(x => !padrao.has(x.id)).length;
      finance.setCategorias(prev => [...prev, { id: makeId("cat"), nome: c.nome, iconKey: c.iconKey, ...EXTRA_CATEGORY_STYLES[extras % EXTRA_CATEGORY_STYLES.length] }]);
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
          <button key={c.id} type="button" onClick={() => setEdit(c)} className="flex items-center gap-2 rounded-md border border-line bg-surface pl-1.5 pr-3 py-1.5 text-[13px] text-fg hover:bg-tile transition">
            <CategoryTile categoria={c} size={26} />{c.nome}
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
  const [iconKey, setIconKey] = useState(() => iconKeyDe(categoria));
  return (
    <Sheet title={categoria.id ? "Editar categoria" : "Nova categoria"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="cat-nome">Nome</label><input id="cat-nome" value={nome} maxLength={20} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Saúde, Pets" /></div>
        <div>
          <p className={labelCls} id="cat-icon">Ícone</p>
          <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-labelledby="cat-icon">
            {Object.entries(ICONS).map(([k, Icon]) => (
              <button key={k} type="button" role="radio" aria-checked={iconKey === k} aria-label={k} onClick={() => setIconKey(k)}
                className={`aspect-square rounded-md flex items-center justify-center border transition ${iconKey === k ? "border-brand bg-brand/[0.06] text-brand-ink" : "border-transparent bg-tile text-fg hover:border-line"}`}>
                <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <button type="button" disabled={!nome.trim()} onClick={() => onSave({ ...(categoria.id ? { id: categoria.id } : {}), nome: nome.trim(), iconKey })} className={`${btnCls.primary} w-full py-3 text-sm`}>Salvar</button>
        {onDelete && <button type="button" onClick={onDelete} className={`${btnCls.secondary} w-full py-2.5 text-[13px] !text-neg`}>Excluir categoria</button>}
        {categoria.id && !onDelete && <p className="text-[12px] lg:text-[13px] text-fg-3 text-center">Categorias padrão podem ser renomeadas, mas não excluídas.</p>}
      </div>
    </Sheet>
  );
}
