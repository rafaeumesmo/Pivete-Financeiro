import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, EmptyHint, inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { formatDateShort, todayKey } from "../lib/dates.js";
import { saldosComigo, totaisSaldos, partesIguais } from "../lib/splits.js";
import { makeId } from "../lib/finance.js";

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
      {splits.error && <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-[12px] text-amber-200">{splits.error}</div>}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Te devem</p><p className="text-lg font-bold text-emerald-400 tabular-nums">{formatBRL(tot.aReceber)}</p></div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Você deve</p><p className={`text-lg font-bold tabular-nums ${tot.aPagar ? "text-red-400" : "text-white"}`}>{formatBRL(tot.aPagar)}</p></div>
      </div>

      {Object.keys(geral).length > 0 && (
        <div>
          <SectionTitle>Por pessoa</SectionTitle>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
            {Object.entries(geral).sort((a, b) => b[1] - a[1]).map(([u, v]) => (
              <div key={u} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-white/80">{pessoas[u]?.avatar_emoji} {nomeDe(pessoas[u])}</span>
                <span className={`text-[13px] font-semibold tabular-nums ${v > 0 ? "text-emerald-400" : "text-red-400"}`}>{v > 0 ? `te deve ${formatBRL(v)}` : `você deve ${formatBRL(-v)}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle action={<SmallButton tone="blue" onClick={() => setNovoGrupo(true)}>+ Grupo</SmallButton>}>Grupos</SectionTitle>
        {groups.length === 0 ? (
          <EmptyHint icon="👥" title={splits.loading ? "Carregando…" : "Nenhum grupo ainda"}>
            Crie um grupo (república, viagem, rolê) com seus amigos, lance quem pagou o quê e o app calcula quem deve pra quem.
          </EmptyHint>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map(g => {
              const t = totaisSaldos(saldoGrupo(g.id));
              return (
                <button key={g.id} type="button" onClick={() => setGrupoId(g.id)} className="text-left rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05] transition px-4 py-3 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{g.name}</span>
                    <span className="block text-[11px] text-white/35 truncate">{g.members.map(m => m.avatar_emoji).join(" ")} · {g.members.length} pessoas</span>
                  </span>
                  <span className={`text-[12px] font-semibold tabular-nums flex-shrink-0 ${t.liquido > 0 ? "text-emerald-400" : t.liquido < 0 ? "text-red-400" : "text-white/35"}`}>
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
              try { const id = await splits.createGroup(nome, ids); setNovoGrupo(false); setGrupoId(id); showToast("Grupo criado 👥", "bg-emerald-600/90"); }
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
        <button type="button" onClick={onVoltar} aria-label="Voltar aos grupos" className="w-8 h-8 rounded-xl bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-white truncate">{grupo.name}</p><p className="text-[11px] text-white/35 truncate">{grupo.members.map(nomeDe).join(", ")}</p></div>
        <SmallButton tone="blue" onClick={() => setDespesa(true)}>+ Despesa</SmallButton>
      </div>

      <div>
        <SectionTitle>Saldos com você</SectionTitle>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
          {outros.map(m => {
            const v = saldos[m.id] || 0;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-0 text-[13px] text-white/80 truncate">{m.avatar_emoji} {nomeDe(m)}</span>
                <span className={`text-[12px] font-semibold tabular-nums ${v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-white/30"}`}>{v > 0 ? `te deve ${formatBRL(v)}` : v < 0 ? `você deve ${formatBRL(-v)}` : "quites"}</span>
                {v !== 0 && <SmallButton tone={v > 0 ? "green" : "neutral"} onClick={() => setQuitar({ pessoa: m, valor: v })}>Quitar</SmallButton>}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SectionTitle>Despesas</SectionTitle>
        {doGrupo.length === 0 ? <p className="text-[12px] text-white/30 px-1">Nenhuma despesa lançada.</p> : (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
            {doGrupo.map(e => {
              const minha = e.shares.find(s => s.user_id === userId)?.amount_cents || 0;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-white truncate">{e.description}</p>
                    <p className="text-[11px] text-white/35 truncate">{e.paid_by === userId ? "você pagou" : `${nomeDe(pessoa(e.paid_by))} pagou`} · {formatDateShort(e.spent_on)} · sua parte {formatBRL(minha)}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-white tabular-nums">{formatBRL(e.amount_cents)}</span>
                  {e.paid_by === userId && (
                    <button type="button" aria-label={`Apagar ${e.description}`} onClick={async () => { if (!window.confirm(`Apagar "${e.description}" do grupo?`)) return; try { await splits.deleteExpense(e.id); } catch (err) { showToast(err.message, "bg-red-600/90"); } }} className="text-white/25 hover:text-red-400 text-sm">✕</button>
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
                showToast("✓ Quitação registrada", "bg-emerald-600/90");
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
          {friends.length === 0 ? <p className="text-[12px] text-white/35">Adicione amigos na aba Amigos primeiro — só amigos aceitos entram em grupos.</p> : (
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {friends.map(f => (
                <label key={f.profile.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition ${sel.has(f.profile.id) ? "border-[#2563eb]/50 bg-[#2563eb]/10" : "border-white/[0.07] bg-white/[0.03]"}`}>
                  <input type="checkbox" checked={sel.has(f.profile.id)} onChange={() => toggle(f.profile.id)} className="accent-[#2563eb]" />
                  <span className="text-[13px] text-white">{f.profile.avatar_emoji} @{f.profile.username}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button type="button" disabled={!nome.trim() || sel.size === 0 || enviando} onClick={async () => { setEnviando(true); await onCreate(nome, [...sel]); setEnviando(false); }} className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40">{enviando ? "Criando…" : "Criar grupo"}</button>
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
              <button key={m.id} type="button" aria-pressed={sel.has(m.id)} onClick={() => toggle(m.id)} className={`rounded-full border px-3 py-1.5 text-[12px] transition ${sel.has(m.id) ? "border-[#2563eb]/60 bg-[#2563eb]/15 text-white" : "border-white/[0.08] text-white/40"}`}>
                {m.avatar_emoji} {m.id === userId ? "você" : `@${m.username}`}
              </button>
            ))}
          </div>
          {amount > 0 && ids.length > 0 && <p className="text-[12px] text-white/45 mt-2">{formatBRL(partes[partes.length - 1].amount_cents)} por pessoa · sua parte {formatBRL(minha)}</p>}
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 cursor-pointer">
          <span className="text-[13px] text-white/70">Registrar no meu extrato <span className="block text-[11px] text-white/30">Só no seu aparelho; conta só a sua parte</span></span>
          <input type="checkbox" checked={espelhar} onChange={e => setEspelhar(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
        </label>
        {espelhar && contas.length > 1 && (
          <select aria-label="Pago com" value={contaId} onChange={e => setContaId(e.target.value)} className={`${inputCls} bg-[#18191f]`}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <button type="button" disabled={!descricao.trim() || amount <= 0 || ids.length < 2 || enviando} onClick={async () => { setEnviando(true); await onSave({ descricao: descricao.trim(), amount, participantIds: ids, espelhar, contaId }); setEnviando(false); }} className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40">{enviando ? "Salvando…" : "Lançar despesa"}</button>
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
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 cursor-pointer">
          <span className="text-[13px] text-white/70">{meDeve ? "Entrou numa das minhas contas" : "Registrar no meu extrato"}</span>
          <input type="checkbox" checked={espelhar} onChange={e => setEspelhar(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
        </label>
        {espelhar && contas.length > 1 && (
          <select aria-label="Conta" value={contaId} onChange={e => setContaId(e.target.value)} className={`${inputCls} bg-[#18191f]`}>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        <button type="button" disabled={valor <= 0 || enviando} onClick={async () => { setEnviando(true); await onSave({ valor, espelhar, contaId }); setEnviando(false); }} className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-40">{enviando ? "Salvando…" : `Quitar ${valor > 0 ? formatBRL(valor) : ""}`}</button>
      </div>
    </Sheet>
  );
}
