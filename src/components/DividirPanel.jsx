import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, EmptyHint, inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { formatDateShort, todayKey } from "../lib/dates.js";
import { saldosComigo, totaisSaldos, partesIguais } from "../lib/splits.js";
import { makeId } from "../lib/finance.js";
import { ChevronLeft, Users, X } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";

const nomeDe = (p) => p ? `@${p.username}` : "alguém";

// Divisão de contas estilo Splitwise: grupos com amigos, saldo de quem deve
// pra quem e "quitar". O que vai pro Supabase: nome do grupo, despesas
// divididas (descrição + valor) e quitações. O espelho no extrato pessoal
// (opcional) fica só no aparelho.
export function DividirPanel({ splits, social, userId, finance, showToast }) {
  const [grupoId, setGrupoId] = useState(null);
  const [novoGrupo, setNovoGrupo] = useState(false);
  const { groups, expenses, settlements } = splits;

  const saldoGrupo = (gid) => saldosComigo(expenses.filter(e => e.group_id === gid), settlements.filter(s => s.group_id === gid), userId);
  const geral = {};
  for (const g of groups) for (const [u, v] of Object.entries(saldoGrupo(g.id))) geral[u] = (geral[u] || 0) + v;
  const tot = totaisSaldos(geral);
  const pessoas = Object.fromEntries(groups.flatMap(g => g.members).map(p => [p.id, p]));
  const grupo = groups.find(g => g.id === grupoId);

  if (grupo) return <GrupoDetalhe grupo={grupo} saldos={saldoGrupo(grupo.id)} splits={splits} userId={userId} finance={finance} showToast={showToast} onVoltar={() => setGrupoId(null)} />;

  return (
    <div className="flex flex-col gap-5">
      {splits.error && <div className="rounded-lg bg-warn/10 border border-warn/30 px-4 py-3 text-[12px] text-warn">{splits.error}</div>}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface border border-line px-4 py-3"><p className="text-[12px] text-fg-3 mb-1">Te devem</p><p className="text-lg font-bold text-pos tabular-nums">{formatBRL(tot.aReceber)}</p></div>
        <div className="rounded-lg bg-surface border border-line px-4 py-3"><p className="text-[12px] text-fg-3 mb-1">Você deve</p><p className={`text-lg font-bold tabular-nums ${tot.aPagar ? "text-neg" : "text-fg"}`}>{formatBRL(tot.aPagar)}</p></div>
      </div>

      {Object.keys(geral).length > 0 && (
        <div>
          <SectionTitle>Por pessoa</SectionTitle>
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">
            {Object.entries(geral).sort((a, b) => b[1] - a[1]).map(([u, v]) => (
              <div key={u} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-fg">{pessoas[u]?.avatar_emoji} {nomeDe(pessoas[u])}</span>
                <span className={`text-[13px] font-semibold tabular-nums ${v > 0 ? "text-pos" : "text-neg"}`}>{v > 0 ? `te deve ${formatBRL(v)}` : `você deve ${formatBRL(-v)}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle action={<SmallButton tone="blue" onClick={() => setNovoGrupo(true)}>+ Grupo</SmallButton>}>Grupos</SectionTitle>
        {groups.length === 0 ? (
          <EmptyHint icon={Users} title={splits.loading ? "Carregando…" : "Nenhum grupo ainda"}>
            Crie um grupo (república, viagem, rolê) com seus amigos, lance quem pagou o quê e o app calcula quem deve pra quem.
          </EmptyHint>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map(g => {
              const t = totaisSaldos(saldoGrupo(g.id));
              return (
                <button key={g.id} type="button" onClick={() => setGrupoId(g.id)} className="text-left rounded-lg border border-line bg-surface hover:bg-tile transition px-4 py-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg truncate">{g.name}</span>
                    <span className="block text-[12px] text-fg-3 truncate">{g.members.map(m => m.avatar_emoji).join(" ")} · {g.members.length} pessoas</span>
                  </span>
                  <span className={`text-[12px] font-semibold tabular-nums flex-shrink-0 ${t.liquido > 0 ? "text-pos" : t.liquido < 0 ? "text-neg" : "text-fg-3"}`}>
                    {t.liquido > 0 ? `+${formatBRL(t.liquido)}` : t.liquido < 0 ? `−${formatBRL(-t.liquido)}` : "quites"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {novoGrupo && (
          <NovoGrupoSheet key="ng" friends={social.friends} onClose={() => setNovoGrupo(false)}
            onCreate={async (nome, ids) => {
              try { const id = await splits.createGroup(nome, ids); setNovoGrupo(false); setGrupoId(id); showToast("Grupo criado", "bg-emerald-600/90"); }
              catch (err) { showToast(err.message, "bg-red-600/90"); }
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function GrupoDetalhe({ grupo, saldos, splits, userId, finance, showToast, onVoltar }) {
  const [despesa, setDespesa] = useState(false);
  const [quitar, setQuitar] = useState(null); // { pessoa, valor } (valor > 0 = me deve)
  const doGrupo = splits.expenses.filter(e => e.group_id === grupo.id);
  const pessoa = (id) => grupo.members.find(m => m.id === id);
  const outros = grupo.members.filter(m => m.id !== userId);

  // Espelho local opcional da despesa no extrato: eu paguei o total, só a
  // minha parte conta como gasto (mesmo formato do "Dividir" do deck).
  function espelharDespesa({ descricao, amount, minhaParte, partes, contaId }) {
    finance.adicionarLancamentos([{ id: makeId("l"), tipo: "saida", valor: amount, categoria: "outros", descricao, data: todayKey(), status: "pago", pagoEm: new Date().toISOString(), contaId, divisao: { partes, minhaParte, porPessoa: minhaParte, aReceber: amount - minhaParte, grupo: grupo.name } }]);
    finance.moverSaldo(contaId, -amount);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onVoltar} aria-label="Voltar aos grupos" className="w-8 h-8 rounded-md bg-tile text-fg-2 hover:text-fg flex items-center justify-center">
          <ChevronLeft size={16} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-fg truncate">{grupo.name}</p><p className="text-[12px] text-fg-3 truncate">{grupo.members.map(nomeDe).join(", ")}</p></div>
        <SmallButton tone="blue" onClick={() => setDespesa(true)}>+ Despesa</SmallButton>
      </div>

      <div>
        <SectionTitle>Saldos com você</SectionTitle>
        <div className="rounded-lg border border-line bg-surface divide-y divide-line">
          {outros.map(m => {
            const v = saldos[m.id] || 0;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-0 text-[13px] text-fg truncate">{m.avatar_emoji} {nomeDe(m)}</span>
                <span className={`text-[12px] font-semibold tabular-nums ${v > 0 ? "text-pos" : v < 0 ? "text-neg" : "text-fg-3"}`}>{v > 0 ? `te deve ${formatBRL(v)}` : v < 0 ? `você deve ${formatBRL(-v)}` : "quites"}</span>
                {v !== 0 && <SmallButton tone={v > 0 ? "green" : "neutral"} onClick={() => setQuitar({ pessoa: m, valor: v })}>Quitar</SmallButton>}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle>Despesas</SectionTitle>
        {doGrupo.length === 0 ? <p className="text-[12px] text-fg-3 px-1">Nenhuma despesa lançada.</p> : (
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">
            {doGrupo.map(e => {
              const minha = e.shares.find(s => s.user_id === userId)?.amount_cents || 0;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-fg truncate">{e.description}</p>
                    <p className="text-[12px] text-fg-3 truncate">{e.paid_by === userId ? "você pagou" : `${nomeDe(pessoa(e.paid_by))} pagou`} · {formatDateShort(e.spent_on)} · sua parte {formatBRL(minha)}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-fg tabular-nums">{formatBRL(e.amount_cents)}</span>
                  {e.paid_by === userId && (
                    <button type="button" aria-label={`Apagar ${e.description}`} onClick={async () => { if (!window.confirm(`Apagar "${e.description}" do grupo?`)) return; try { await splits.deleteExpense(e.id); } catch (err) { showToast(err.message, "bg-red-600/90"); } }} className="w-7 h-7 rounded-md flex items-center justify-center text-fg-3 hover:text-neg hover:bg-tile flex-shrink-0"><X size={14} strokeWidth={ICON_STROKE} aria-hidden /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {despesa && (
          <DespesaSheet key="desp" grupo={grupo} userId={userId} contas={finance.contas} contaPadrao={finance.contaPadrao} onClose={() => setDespesa(false)}
            onSave={async ({ descricao, amount, participantIds, espelhar, contaId }) => {
              try {
                const { minhaParte } = await splits.addExpense(grupo.id, { description: descricao, amount, participantIds });
                if (espelhar) espelharDespesa({ descricao, amount, minhaParte, partes: participantIds.length, contaId });
                setDespesa(false);
                showToast(`Despesa lançada · sua parte ${formatBRL(minhaParte)}`, "bg-emerald-600/90");
              } catch (err) { showToast(err.message, "bg-red-600/90"); }
            }} />
        )}
        {quitar && (
          <QuitarSheet key="q" {...quitar} contas={finance.contas} contaPadrao={finance.contaPadrao} onClose={() => setQuitar(null)}
            onSave={async ({ valor, espelhar, contaId }) => {
              const meDeve = quitar.valor > 0;
              try {
                await splits.settle(grupo.id, meDeve ? quitar.pessoa.id : userId, meDeve ? userId : quitar.pessoa.id, valor);
                if (espelhar) {
                  if (meDeve) finance.moverSaldo(contaId, valor); // reembolso: volta pro saldo, não é renda
                  else {
                    finance.adicionarLancamentos([{ id: makeId("l"), tipo: "saida", valor, categoria: "outros", descricao: `Acerto com ${nomeDe(quitar.pessoa)} (${grupo.name})`, data: todayKey(), status: "pago", pagoEm: new Date().toISOString(), contaId }]);
                    finance.moverSaldo(contaId, -valor);
                  }
                }
                setQuitar(null);
                showToast("Quitação registrada", "bg-emerald-600/90");
              } catch (err) { showToast(err.message, "bg-red-600/90"); }
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NovoGrupoSheet({ friends, onClose, onCreate }) {
  const [nome, setNome] = useState("");
  const [sel, setSel] = useState(() => new Set());
  const [enviando, setEnviando] = useState(false);
  const toggle = (id) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Sheet title="Novo grupo" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="g-nome">Nome</label><input id="g-nome" value={nome} maxLength={60} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Ex: Apê 302, Viagem praia" /></div>
        <div>
          <p className={labelCls}>Amigos no grupo</p>
          {friends.length === 0 ? <p className="text-[12px] text-fg-3">Adicione amigos na aba Amigos primeiro — só amigos aceitos entram em grupos.</p> : (
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {friends.map(f => (
                <label key={f.profile.id} className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition ${sel.has(f.profile.id) ? "border-brand bg-brand/[0.06]" : "border-line bg-surface"}`}>
                  <input type="checkbox" checked={sel.has(f.profile.id)} onChange={() => toggle(f.profile.id)} className="accent-brand" />
                  <span className="text-[13px] text-fg">{f.profile.avatar_emoji} @{f.profile.username}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" disabled={!nome.trim() || sel.size === 0 || enviando} onClick={async () => { setEnviando(true); await onCreate(nome, [...sel]); setEnviando(false); }} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-40">{enviando ? "Criando…" : "Criar grupo"}</button>
      </div>
    </Sheet>
  );
}

function DespesaSheet({ grupo, userId, contas, contaPadrao, onClose, onSave }) {
  const [descricao, setDescricao] = useState("");
  const [amount, setAmount] = useState(0);
  const [sel, setSel] = useState(() => new Set(grupo.members.map(m => m.id)));
  const [espelhar, setEspelhar] = useState(true);
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const [enviando, setEnviando] = useState(false);
  const ids = grupo.members.map(m => m.id).filter(id => sel.has(id));
  const partes = partesIguais(amount, ids);
  const minha = partes.find(p => p.user_id === userId)?.amount_cents || 0;
  const toggle = (id) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <Sheet title="Nova despesa" kicker={`${grupo.name} · paga por você`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="e-desc">Descrição</label><input id="e-desc" value={descricao} maxLength={80} onChange={e => setDescricao(e.target.value)} className={inputCls} placeholder="Ex: Mercado, luz, Uber" /></div>
        <div><label className={labelCls} htmlFor="e-valor">Valor total</label><MoneyInput id="e-valor" value={amount} onChange={setAmount} className={`${inputCls} text-lg font-bold`} /></div>
        <div>
          <p className={labelCls}>Dividir igualmente entre</p>
          <div className="flex flex-wrap gap-1.5">
            {grupo.members.map(m => (
              <button key={m.id} type="button" aria-pressed={sel.has(m.id)} onClick={() => toggle(m.id)} className={`rounded-md border px-3 py-1.5 text-[13px] transition ${sel.has(m.id) ? "border-brand bg-brand/[0.06] text-fg" : "border-line text-fg-2"}`}>
                {m.avatar_emoji} {m.id === userId ? "você" : `@${m.username}`}
              </button>
            ))}
          </div>
          {amount > 0 && ids.length > 0 && <p className="text-[12px] text-fg-2 mt-2">{formatBRL(partes[partes.length - 1].amount_cents)} por pessoa · sua parte {formatBRL(minha)}</p>}
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg bg-surface border border-line px-4 py-3 cursor-pointer">
          <span className="text-[13px] text-fg">Registrar no meu extrato <span className="block text-[12px] text-fg-3">Só no seu aparelho; conta só a sua parte</span></span>
          <input type="checkbox" checked={espelhar} onChange={e => setEspelhar(e.target.checked)} className="w-5 h-5 accent-brand" />
        </label>
        {espelhar && contas.length > 1 && (
          <select aria-label="Pago com" value={contaId} onChange={e => setContaId(e.target.value)} className={`${inputCls} bg-surface`}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <button type="button" disabled={!descricao.trim() || amount <= 0 || ids.length < 2 || enviando} onClick={async () => { setEnviando(true); await onSave({ descricao: descricao.trim(), amount, participantIds: ids, espelhar, contaId }); setEnviando(false); }} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-40">{enviando ? "Salvando…" : "Lançar despesa"}</button>
      </div>
    </Sheet>
  );
}

function QuitarSheet({ pessoa, valor: saldo, contas, contaPadrao, onClose, onSave }) {
  const meDeve = saldo > 0;
  const [valor, setValor] = useState(Math.abs(saldo));
  const [espelhar, setEspelhar] = useState(true);
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const [enviando, setEnviando] = useState(false);
  return (
    <Sheet title={meDeve ? `Recebi de @${pessoa.username}` : `Paguei @${pessoa.username}`} kicker={meDeve ? `Te deve ${formatBRL(saldo)}` : `Você deve ${formatBRL(-saldo)}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="q-valor">Valor</label><MoneyInput id="q-valor" value={valor} onChange={setValor} className={`${inputCls} text-lg font-bold`} /></div>
        <label className="flex items-center justify-between gap-3 rounded-lg bg-surface border border-line px-4 py-3 cursor-pointer">
          <span className="text-[13px] text-fg">{meDeve ? "Entrou numa das minhas contas" : "Registrar no meu extrato"}</span>
          <input type="checkbox" checked={espelhar} onChange={e => setEspelhar(e.target.checked)} className="w-5 h-5 accent-brand" />
        </label>
        {espelhar && contas.length > 1 && (
          <select aria-label="Conta" value={contaId} onChange={e => setContaId(e.target.value)} className={`${inputCls} bg-surface`}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <button type="button" disabled={valor <= 0 || enviando} onClick={async () => { setEnviando(true); await onSave({ valor, espelhar, contaId }); setEnviando(false); }} className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-40">{enviando ? "Salvando…" : `Quitar ${valor > 0 ? formatBRL(valor) : ""}`}</button>
      </div>
    </Sheet>
  );
}
