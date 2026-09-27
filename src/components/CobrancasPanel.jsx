import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { SectionTitle, SmallButton, EmptyHint, ProgressBar, inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { formatDateShort } from "../lib/dates.js";

// Avisos "paguei" que chegaram pelo link, lidos pela função
// charge_payments_for (02_charges.sql) — só com o id da própria cobrança.
function useAvisos(ids) {
  const [avisos, setAvisos] = useState({});
  const key = ids.join(",");
  useEffect(() => {
    if (!supabase || !key) return;
    let vivo = true;
    Promise.all(key.split(",").map(id => supabase.rpc("charge_payments_for", { p_charge_id: id }).then(({ data }) => [id, data || []])))
      .then(pares => { if (vivo) setAvisos(Object.fromEntries(pares)); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [key]);
  return avisos;
}

export function CobrancasPanel({ cob, finance, nome, showToast }) {
  const [receber, setReceber] = useState(null); // { cobranca, nome?, valor? }
  const [verArquivadas, setVerArquivadas] = useState(false);
  const abertas = cob.cobrancas.filter(c => !c.arquivada);
  const arquivadas = cob.cobrancas.filter(c => c.arquivada);
  const avisos = useAvisos(abertas.map(c => c.id));
  const totalAberto = abertas.reduce((a, c) => a + Math.max(0, c.aReceber - c.recebidos.reduce((x, r) => x + r.valor, 0)), 0);

  function Card({ c }) {
    const recebido = c.recebidos.reduce((a, r) => a + r.valor, 0);
    const falta = Math.max(0, c.aReceber - recebido);
    const nomesRecebidos = new Set(c.recebidos.map(r => r.nome.toLowerCase()));
    const novos = (avisos[c.id] || []).filter(a => !nomesRecebidos.has(a.payer_name.toLowerCase()));
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{c.titulo}</p>
            <p className="text-[11px] text-white/35">{formatDateShort(c.criadaEm.slice(0, 10))} · {formatBRL(c.total)} ÷ {c.partes} · {formatBRL(c.porPessoa)} cada</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-sm font-bold tabular-nums ${falta ? "text-blue-300" : "text-emerald-400"}`}>{falta ? formatBRL(falta) : "Quitada"}</p>
            {falta > 0 && <p className="text-[11px] text-white/35">a receber</p>}
          </div>
        </div>
        <ProgressBar pct={c.aReceber ? (recebido / c.aReceber) * 100 : 100} color={falta ? "#3987e5" : "#10b981"} label={`Recebido de ${c.titulo}`} />
        {novos.map(a => (
          <div key={a.payer_name + a.created_at} className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <span className="text-[12px] text-emerald-200 truncate">🔔 <strong>{a.payer_name}</strong> marcou "paguei" pelo link</span>
            <SmallButton tone="green" onClick={() => setReceber({ cobranca: c, nome: a.payer_name, valor: c.porPessoa })}>Confirmar</SmallButton>
          </div>
        ))}
        {c.recebidos.length > 0 && (
          <p className="text-[11px] text-white/40 mt-2">Recebido: {c.recebidos.map(r => `${r.nome} ${formatBRL(r.valor)}`).join(" · ")}</p>
        )}
        <div className="flex gap-2 mt-3 justify-end flex-wrap">
          {c.arquivada
            ? <SmallButton onClick={() => cob.arquivar(c.id, false)}>Reabrir</SmallButton>
            : <>
                {falta === 0 && <SmallButton onClick={() => cob.arquivar(c.id)}>Arquivar</SmallButton>}
                {falta > 0 && <SmallButton onClick={() => setReceber({ cobranca: c, nome: "", valor: Math.min(c.porPessoa, falta) })}>Recebi</SmallButton>}
                {falta > 0 && <SmallButton tone="blue" onClick={() => cob.compartilhar(c, nome, showToast)}>Enviar link</SmallButton>}
              </>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <label htmlFor="pix" className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35">Sua chave Pix (vai no link, opcional)</label>
        <input id="pix" value={cob.pixKey} maxLength={100} onChange={e => cob.setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" className="mt-1.5 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20" />
      </div>

      <SectionTitle>A receber · {formatBRL(totalAberto)}</SectionTitle>
      {abertas.length === 0 ? (
        <EmptyHint icon="🧾" title="Nenhuma cobrança aberta">
          No deck, arraste uma conta pra cima ("Dividir") — você escolhe entre quantas pessoas e manda o link. Quem recebe vê o valor e marca "paguei", sem precisar de conta.
        </EmptyHint>
      ) : abertas.map(c => <Card key={c.id} c={c} />)}

      {arquivadas.length > 0 && (
        <div>
          <button type="button" onClick={() => setVerArquivadas(v => !v)} className="text-[12px] text-white/35 hover:text-white/60">{verArquivadas ? "▾" : "▸"} Arquivadas ({arquivadas.length})</button>
          {verArquivadas && <div className="flex flex-col gap-3 mt-3">{arquivadas.map(c => <Card key={c.id} c={c} />)}</div>}
        </div>
      )}

      <AnimatePresence>
        {receber && (
          <ReceberSheet key="rec" {...receber} contas={finance.contas} contaPadrao={finance.contaPadrao} onClose={() => setReceber(null)}
            onConfirm={(dados) => {
              cob.registrarRecebimento(receber.cobranca.id, dados);
              showToast(`✓ Recebido ${formatBRL(dados.valor)} de ${dados.nome || "alguém"}`, "bg-emerald-600/90");
              setReceber(null);
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReceberSheet({ cobranca, nome: nomeInicial, valor: valorInicial, contas, contaPadrao, onClose, onConfirm }) {
  const [nome, setNome] = useState(nomeInicial || "");
  const [valor, setValor] = useState(valorInicial || 0);
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  return (
    <Sheet title="Recebi" kicker={cobranca.titulo} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div><label className={labelCls} htmlFor="rc-nome">De quem</label><input id="rc-nome" value={nome} maxLength={40} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Nome" /></div>
        <div><label className={labelCls} htmlFor="rc-valor">Valor</label><MoneyInput id="rc-valor" value={valor} onChange={setValor} className={`${inputCls} text-lg font-bold`} /></div>
        {contas.length > 1 && (
          <div><label className={labelCls} htmlFor="rc-conta">Entrou em</label>
            <select id="rc-conta" value={contaId} onChange={e => setContaId(e.target.value)} className={`${inputCls} bg-sheet`}>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
        <p className="text-[11px] text-white/30">Entra no saldo da conta como reembolso — não conta como renda.</p>
        <button type="button" disabled={valor <= 0} onClick={() => onConfirm({ nome, valor, contaId })} className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-40">Confirmar {valor > 0 ? formatBRL(valor) : ""}</button>
      </div>
    </Sheet>
  );
}
