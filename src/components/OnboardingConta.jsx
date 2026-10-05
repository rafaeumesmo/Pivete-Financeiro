import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, Landmark, Repeat, PartyPopper } from "lucide-react";
import { MoneyInput } from "./MoneyInput.jsx";
import { CategoryTile } from "./CategoryTile.jsx";
import { btnCls, inputCls, labelCls } from "./ui.jsx";
import { ICON_STROKE } from "../lib/icons.js";
import { formatBRL } from "../lib/money.js";
import { CONTA_INICIAL } from "../hooks/useFinance.js";

// Onboarding de quem acabou de criar a conta (sem dados ainda): saldo da
// conta principal e os fixos do mês. O mês de exemplo nunca entra aqui.

const ATALHOS = [
  { id: "salario",   nome: "Salário ou estágio", categoria: "renda",       tipo: "entrada" },
  { id: "aluguel",   nome: "Aluguel",            categoria: "casa",        tipo: "saida" },
  { id: "luz",       nome: "Conta de luz",       categoria: "casa",        tipo: "saida" },
  { id: "internet",  nome: "Internet",           categoria: "casa",        tipo: "saida" },
  { id: "streaming", nome: "Streaming",          categoria: "assinaturas", tipo: "saida" },
  { id: "passagem",  nome: "Passagem",           categoria: "transporte",  tipo: "saida" },
];

const PASSOS = 3;

// Valor + dia do mês, com rótulo visível (só "5" no campo não diz que é o dia).
function ValorEDia({ valor, dia, nome, onValor, onDia, className = "" }) {
  return (
    <div className={`grid grid-cols-[1fr_96px] gap-2 ${className}`}>
      <label className="flex flex-col gap-1"><span className="text-[12px] text-fg-2">Valor</span>
        <MoneyInput value={valor} onChange={onValor} ariaLabel={`Valor de ${nome}`} className={inputCls} /></label>
      <label className="flex flex-col gap-1"><span className="text-[12px] text-fg-2">Todo dia</span>
        <input type="number" inputMode="numeric" min={1} max={31} value={dia} onChange={(e) => onDia(e.target.value)} aria-label={`Dia de ${nome}`} className={inputCls} /></label>
    </div>
  );
}

export function OnboardingConta({ finance, onFinish }) {
  const [passo, setPasso] = useState(0);
  const [nomeConta, setNomeConta] = useState(CONTA_INICIAL.nome);
  const [saldo, setSaldo] = useState(0);
  const [fixos, setFixos] = useState({}); // id → { valor, dia }
  const [outro, setOutro] = useState({ nome: "", valor: 0, dia: 10 });

  const marcados = ATALHOS.filter((a) => fixos[a.id]);
  const escolhidos = [
    ...marcados.map((a) => ({ ...a, ...fixos[a.id] })),
    ...(outro.nome.trim() && outro.valor > 0 ? [{ id: "outro", nome: outro.nome.trim(), categoria: "outros", tipo: "saida", valor: outro.valor, dia: outro.dia }] : []),
  ].filter((f) => f.valor > 0);

  function alternar(id) {
    setFixos((p) => { const n = { ...p }; if (n[id]) delete n[id]; else n[id] = { valor: 0, dia: 10 }; return n; });
  }
  const mudar = (id, campo, v) => setFixos((p) => ({ ...p, [id]: { ...p[id], [campo]: v } }));
  const diaValido = (d) => Math.min(31, Math.max(1, Number(d) || 1));

  function concluir() {
    finance.salvarConta({ id: CONTA_INICIAL.id, nome: nomeConta.trim() || CONTA_INICIAL.nome, saldo });
    for (const f of escolhidos) {
      finance.salvarRecorrente({ nome: f.nome, valor: f.valor, categoria: f.categoria, tipo: f.tipo, frequencia: "mensal", dia: diaValido(f.dia) });
    }
    onFinish();
  }

  const titulo = ["Quanto tem na conta agora?", "Quais contas chegam todo mês?", "Tudo pronto"][passo];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4 bg-black/40">
      <motion.div role="dialog" aria-modal="true" aria-label="Começar com os seus dados" initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="w-full max-w-sm bg-surface rounded-lg border border-line shadow overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-center justify-between flex-shrink-0">
          <div><p className="text-[13px] text-fg-2 mb-1">Seus dados</p><h2 className="text-[17px] font-semibold text-fg leading-tight">{titulo}</h2></div>
          <span className="text-[12px] text-fg-3 tabular-nums">{passo + 1} / {PASSOS}</span>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <AnimatePresence mode="wait">
            {passo === 0 && (
              <motion.div key="saldo" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4">
                <span className="w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center" aria-hidden><Landmark size={24} strokeWidth={ICON_STROKE} /></span>
                <p className="text-sm text-fg-2 leading-relaxed">O saldo de hoje da sua conta principal. Dá pra ajustar e criar outras contas depois, no Perfil.</p>
                <div><label className={labelCls} htmlFor="ob-conta">Nome da conta</label><input id="ob-conta" value={nomeConta} maxLength={30} onChange={(e) => setNomeConta(e.target.value)} className={inputCls} /></div>
                <div><label className={labelCls} htmlFor="ob-saldo">Saldo agora</label><MoneyInput id="ob-saldo" value={saldo} onChange={setSaldo} className={`${inputCls} text-lg font-bold`} /></div>
              </motion.div>
            )}

            {passo === 1 && (
              <motion.div key="fixos" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
                <p className="text-sm text-fg-2 leading-relaxed">Marque o que se repete todo mês. Elas viram cards no dia certo.</p>
                {ATALHOS.map((a) => {
                  const on = !!fixos[a.id];
                  return (
                    <div key={a.id} className={`rounded-md border transition ${on ? "border-brand bg-brand/[0.06]" : "border-line"}`}>
                      <button type="button" aria-pressed={on} onClick={() => alternar(a.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                        <CategoryTile categoria={{ id: a.categoria }} size={32} />
                        <span className="flex-1 text-sm text-fg">{a.nome}</span>
                        <span className={`w-5 h-5 rounded-sm border flex items-center justify-center ${on ? "bg-brand border-brand text-on-brand" : "border-line"}`} aria-hidden>{on && <Check size={14} strokeWidth={ICON_STROKE} />}</span>
                      </button>
                      {on && (
                        <ValorEDia valor={fixos[a.id].valor} dia={fixos[a.id].dia} nome={a.nome}
                          onValor={(v) => mudar(a.id, "valor", v)} onDia={(v) => mudar(a.id, "dia", v)} className="px-3 pb-3" />
                      )}
                    </div>
                  );
                })}
                <div className="rounded-md border border-line p-3 flex flex-col gap-2">
                  <input value={outro.nome} maxLength={40} onChange={(e) => setOutro((o) => ({ ...o, nome: e.target.value }))} placeholder="Outra conta (ex.: academia)" aria-label="Nome de outra conta fixa" className={inputCls} />
                  {outro.nome.trim() && (
                    <ValorEDia valor={outro.valor} dia={outro.dia} nome={outro.nome.trim()}
                      onValor={(v) => setOutro((o) => ({ ...o, valor: v }))} onDia={(v) => setOutro((o) => ({ ...o, dia: v }))} />
                  )}
                </div>
              </motion.div>
            )}

            {passo === 2 && (
              <motion.div key="pronto" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col gap-4 text-center">
                <span className="mx-auto w-12 h-12 rounded-md bg-tile text-pos flex items-center justify-center" aria-hidden><PartyPopper size={24} strokeWidth={ICON_STROKE} /></span>
                <p className="text-sm text-fg leading-relaxed">
                  {nomeConta.trim() || CONTA_INICIAL.nome} com {formatBRL(saldo)}
                  {escolhidos.length ? ` e ${escolhidos.length} ${escolhidos.length === 1 ? "conta fixa" : "contas fixas"}.` : "."}
                </p>
                <p className="text-[13px] text-fg-2 leading-relaxed">O que vence nos próximos 7 dias já aparece no deck. Pagou, arraste pro lado.</p>
                {escolhidos.length > 0 && (
                  <ul className="text-left rounded-md border border-line divide-y divide-line">
                    {escolhidos.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                        <Repeat size={14} strokeWidth={ICON_STROKE} className="text-fg-3" aria-hidden />
                        <span className="flex-1 text-fg truncate">{f.nome}</span>
                        <span className={`tabular-nums ${f.tipo === "entrada" ? "text-pos" : "text-fg"}`}>{formatBRL(f.valor)}</span>
                        <span className="text-fg-3 tabular-nums">dia {diaValido(f.dia)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 pb-5 pt-1 flex items-center gap-2 flex-shrink-0">
          {passo > 0 && <button type="button" onClick={() => setPasso((p) => p - 1)} className={`${btnCls.ghost} px-3 py-3 text-sm`}><ChevronLeft size={16} strokeWidth={ICON_STROKE} aria-hidden />Voltar</button>}
          {passo < 2
            ? <button type="button" onClick={() => setPasso((p) => p + 1)} className={`${btnCls.primary} flex-1 py-3 text-sm`}>{passo === 1 && !escolhidos.length ? "Pular por enquanto" : "Continuar"}</button>
            : <button type="button" onClick={concluir} className={`${btnCls.primary} flex-1 py-3 text-sm`}>Começar</button>}
        </div>
      </motion.div>
    </div>
  );
}
