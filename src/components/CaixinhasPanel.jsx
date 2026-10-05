import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, EmptyHint, ProgressBar, inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { formatDateShort, todayKey, fromDateStr } from "../lib/dates.js";
import { PiggyBank } from "lucide-react";

// Quanto falta guardar por mês pra bater a meta no prazo.
function porMes(meta, hoje) {
  if (!meta.prazo || meta.guardado >= meta.alvo) return null;
  const a = fromDateStr(hoje), b = fromDateStr(meta.prazo);
  const meses = Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
  return Math.ceil((meta.alvo - meta.guardado) / meses);
}

export function CaixinhasPanel({ finance, showToast, onActivity }) {
  const { metas, contas } = finance;
  const [editando, setEditando] = useState(null); // meta | {} (nova)
  const [aporte, setAporte] = useState(null);     // { meta, modo: "aportar" | "retirar" }
  const hoje = todayKey();
  const total = metas.reduce((a, m) => a + m.guardado, 0);

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle action={<SmallButton tone="blue" onClick={() => setEditando({})}>+ Nova caixinha</SmallButton>}>
        Guardado · {formatBRL(total)}
      </SectionTitle>
      {metas.length === 0 && (
        <EmptyHint icon={PiggyBank} title="Nenhuma caixinha ainda" action={<SmallButton tone="blue" onClick={() => setEditando({})}>Criar a primeira</SmallButton>}>
          Separe dinheiro pra reserva de emergência, viagem, troca de celular… Cada aporte sai de uma conta e fica guardado aqui.
        </EmptyHint>
      )}
      {/* Desktop: cards em 2 colunas. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
      {metas.map(m => {
        const pct = m.alvo > 0 ? (m.guardado / m.alvo) * 100 : 0;
        const completa = m.guardado >= m.alvo && m.alvo > 0;
        const mensal = porMes(m, hoje);
        return (
          <div key={m.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <button type="button" onClick={() => setEditando(m)} className="text-left min-w-0">
                <p className="text-sm font-semibold text-fg truncate">{m.nome}</p>
                <p className="text-[12px] text-fg-3">
                  {m.prazo ? `até ${formatDateShort(m.prazo)}` : "sem prazo"}
                  {mensal ? ` · guarde ${formatBRL(mensal)}/mês` : ""}
                </p>
              </button>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-fg tabular-nums">{formatBRL(m.guardado)}</p>
                <p className="text-[12px] text-fg-3 tabular-nums">de {formatBRL(m.alvo)}</p>
              </div>
            </div>
            <ProgressBar pct={pct} color={completa ? "rgb(var(--pos))" : "rgb(var(--brand))"} label={`Progresso de ${m.nome}`} />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[12px] text-fg-2 tabular-nums">{Math.round(pct)}%</span>
              <div className="flex gap-2">
                {m.guardado > 0 && <SmallButton onClick={() => setAporte({ meta: m, modo: "retirar" })}>Retirar</SmallButton>}
                <SmallButton tone="green" onClick={() => setAporte({ meta: m, modo: "aportar" })}>+ Aportar</SmallButton>
              </div>
            </div>
          </div>
        );
      })}
      </div>

      <AnimatePresence>
        {editando && (
          <MetaSheet key="meta" meta={editando} onClose={() => setEditando(null)}
            onSave={m => { finance.salvarMeta(m); setEditando(null); showToast(m.id ? "Caixinha atualizada" : "Caixinha criada", "bg-emerald-600/90"); }}
            onDelete={editando.id ? () => {
              if (!window.confirm(`Excluir a caixinha "${editando.nome}"?${editando.guardado > 0 ? ` Os ${formatBRL(editando.guardado)} guardados voltam pra ${contas[0]?.nome}.` : ""}`)) return;
              finance.removerMeta(editando.id); setEditando(null);
            } : null} />
        )}
        {aporte && (
          <AporteSheet key="aporte" {...aporte} contas={contas} contaPadrao={finance.contaPadrao} onClose={() => setAporte(null)}
            onConfirm={(valor, contaId) => {
              const v = aporte.modo === "retirar" ? -Math.min(valor, aporte.meta.guardado) : valor;
              finance.aportar(aporte.meta.id, v, contaId);
              onActivity();
              showToast(v > 0 ? `+${formatBRL(v)} em ${aporte.meta.nome}` : `Retirado ${formatBRL(-v)}`, "bg-emerald-600/90");
              setAporte(null);
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function MetaSheet({ meta, onClose, onSave, onDelete }) {
  const [f, setF] = useState({ nome: meta.nome || "", alvo: meta.alvo || 0, prazo: meta.prazo || "" });
  const [erro, setErro] = useState("");
  function salvar() {
    if (!f.nome.trim()) return setErro("Dê um nome à caixinha.");
    if (f.alvo <= 0) return setErro("Defina quanto quer juntar.");
    onSave({ ...(meta.id ? { id: meta.id } : {}), nome: f.nome.trim(), alvo: f.alvo, prazo: f.prazo || null });
  }
  return (
    <Sheet title={meta.id ? "Editar caixinha" : "Nova caixinha"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="m-nome">Nome</label><input id="m-nome" value={f.nome} maxLength={40} onChange={e => setF(p => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder="Ex: Reserva de emergência" /></div>
        <div><label className={labelCls} htmlFor="m-alvo">Meta</label><MoneyInput id="m-alvo" value={f.alvo} onChange={alvo => setF(p => ({ ...p, alvo }))} className={`${inputCls} text-lg font-bold`} /></div>
        <div><label className={labelCls} htmlFor="m-prazo">Prazo (opcional)</label><input id="m-prazo" type="date" value={f.prazo} onChange={e => setF(p => ({ ...p, prazo: e.target.value }))} className={`${inputCls} [color-scheme:dark]`} /></div>
        {erro && <p className="text-[12px] text-neg">{erro}</p>}
        <button type="button" onClick={salvar} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition">Salvar</button>
        {onDelete && <button type="button" onClick={onDelete} className="w-full rounded-md border border-line bg-surface py-2.5 text-[13px] font-medium text-neg hover:bg-tile transition">Excluir caixinha</button>}
      </div>
    </Sheet>
  );
}

function AporteSheet({ meta, modo, contas, contaPadrao, onClose, onConfirm }) {
  const [valor, setValor] = useState(0);
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const retirar = modo === "retirar";
  return (
    <Sheet title={retirar ? "Retirar da caixinha" : "Aportar na caixinha"} kicker={`${meta.nome} · ${formatBRL(meta.guardado)} guardados`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <MoneyInput autoFocus value={valor} onChange={setValor} className={`${inputCls} text-2xl font-bold`} />
        {contas.length > 1 && (
          <div>
            <label className={labelCls} htmlFor="ap-conta">{retirar ? "Devolver pra" : "Tirar de"}</label>
            <select id="ap-conta" value={contaId} onChange={e => setContaId(e.target.value)} className={`${inputCls} bg-surface`}>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome} · {formatBRL(c.saldo)}</option>)}
            </select>
          </div>
        )}
        <button type="button" disabled={valor <= 0} onClick={() => onConfirm(valor, contaId)} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-40">
          {retirar ? "Retirar" : "Guardar"} {valor > 0 ? formatBRL(retirar ? Math.min(valor, meta.guardado) : valor) : ""}
        </button>
      </div>
    </Sheet>
  );
}
