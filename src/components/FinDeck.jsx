import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeCard } from "./SwipeCard.jsx";
import { LancamentoCardContent, RevisaoCardContent } from "./LancamentoCard.jsx";
import { ActionButtons } from "./ActionButtons.jsx";
import { SnoozeSetupModal } from "./SnoozeSetupModal.jsx";
import { Sheet } from "./Sheet.jsx";
import { PainelPanel } from "./PainelPanel.jsx";
import { DecisoesCard } from "./DecisoesCard.jsx";
import { EyeButton, btnCls } from "./ui.jsx";
import { CircleCheck, Receipt, Scissors, Plus, Minus } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { findCategoria } from "../lib/categories.js";
import { useOcultarValores } from "../lib/privacy.js";
import { formatBRL, splitCents } from "../lib/money.js";
import { computeSnoozeUntil, todayKey } from "../lib/dates.js";
import { usePlanoCtx } from "../hooks/usePlano.js";
import { deckLancamentos, itensRevisao, revisaoPendente, economiaPotencial } from "../lib/finance.js";

const LABELS_SAIDA   = { right: "Paguei", left: "Adiar", up: "Dividir" };
const LABELS_ENTRADA = { right: "Recebi", left: "Adiar" };
const LABELS_REVISAO = { right: "Valeu a pena", left: "Cortar" };

// Aba Início: deck de contas a pagar/receber (padrão), o Painel com os gráficos
// ou "Revisar gastos" (aberto pelo deck vazio).
export function FinDeck({
  finance, isDesktop, snoozeDefault, setSnoozeDefault, snoozeAsked, setSnoozeAsked,
  keyboardEnabled, onActivity, onDecision, onDividido, onQuitouDivida, onDeckComplete,
  onNavigate, showToast, stats, headerActions,
}) {
  const { tentar } = usePlanoCtx();
  const { lancamentos, categorias, contas, contaPadrao, recorrentes, revisoes } = finance;
  const [mode, setMode] = useState("contas"); // "contas" | "painel" | "revisar"
  const [swipeExit, setSwipeExit] = useState({ vx: 0, vy: 0, dir: null });
  const [payCtx, setPayCtx] = useState(null);       // { lancamento, vel }
  const [splitCtx, setSplitCtx] = useState(null);   // { lancamento, vel }
  const [snoozeCtx, setSnoozeCtx] = useState(null); // { lancamento, vel }

  const hoje = todayKey();
  const deck = deckLancamentos(lancamentos);
  const itensTodos = itensRevisao({ recorrentes, lancamentos }, hoje);
  const revisaoDeck = revisaoPendente(itensTodos, revisoes);
  const items = mode === "contas" ? deck : mode === "revisar" ? revisaoDeck : [];
  const top = items[items.length - 1];
  const labels = mode === "revisar" ? LABELS_REVISAO : top?.tipo === "entrada" ? LABELS_ENTRADA : LABELS_SAIDA;
  const totalPagar = deck.filter(l => l.tipo === "saida").reduce((a, l) => a + l.valor, 0);
  const totalReceber = deck.filter(l => l.tipo === "entrada").reduce((a, l) => a + l.valor, 0);
  const modalOpen = !!(payCtx || splitCtx || snoozeCtx);
  const saldoContas = contas.reduce((a, c) => a + c.saldo, 0);
  const [ocultar] = useOcultarValores();
  const brl = (v) => formatBRL(v, { oculto: ocultar });

  function exit(dir, vel = {}) {
    setSwipeExit({ vx: 0, vy: 0, ...vel, dir });
  }

  function registrar(l, label, direction) {
    onActivity();
    onDecision({ id: Date.now(), lancamentoId: l.id, title: l.descricao, valor: l.valor, categoria: l.categoria, direction, label, decidedAt: new Date().toISOString() });
  }

  // ── Ações do modo contas ─────────────────────────────────
  function confirmarPagamento(l, contaId, vel) {
    exit("right", vel);
    const willEmpty = deck.length === 1;
    const { quitouDivida } = finance.pagar(l.id, contaId);
    registrar(l, l.tipo === "entrada" ? "Recebi" : "Paguei", "right");
    showToast(l.tipo === "entrada" ? `Recebido ${brl(l.valor)}` : `Pago ${brl(l.valor)}`, "bg-emerald-600/90");
    try { navigator.vibrate?.([30, 50, 30]); } catch {}
    if (quitouDivida) onQuitouDivida?.(l);
    if (willEmpty) onDeckComplete?.();
  }

  function confirmarAdiamento(l, pref, vel) {
    exit("left", vel);
    finance.adiar(l.id, computeSnoozeUntil(pref));
    registrar(l, "Adiei", "left");
    showToast("Adiado", "bg-amber-600/90");
    try { navigator.vibrate?.(30); } catch {}
  }

  function confirmarDivisao(l, partes, contaId, vel) {
    exit("up", vel);
    const dividido = finance.dividir(l.id, partes, contaId);
    registrar(l, "Dividi", "up");
    showToast(`Dividido em ${partes} · ${brl(dividido.divisao.porPessoa)} por pessoa`, "bg-blue-600/90");
    try { navigator.vibrate?.(80); } catch {}
    onDividido?.(dividido);
    if (deck.length === 1) onDeckComplete?.();
  }

  // Devolve false quando a decisão fica pendente de um modal — o card volta
  // pro centro (ver SwipeCard) e só sai quando o modal confirma.
  function handleSwipe(direction, item, vel = {}) {
    if (mode === "revisar") {
      exit(direction, vel);
      finance.revisar(item.key, direction === "right" ? "valeu" : "cortar");
      onActivity();
      showToast(direction === "right" ? "Valeu a pena" : `Cortar · ${brl(item.valorMensal)}`, direction === "right" ? "bg-emerald-600/90" : "bg-red-600/90");
      return true;
    }
    const l = item;
    if (direction === "right") {
      if (contas.length > 1) { setPayCtx({ lancamento: l, vel }); return false; }
      confirmarPagamento(l, contas[0]?.id, vel);
      return true;
    }
    if (direction === "left") {
      if (!snoozeAsked) { setSnoozeCtx({ lancamento: l, vel }); return false; }
      confirmarAdiamento(l, snoozeDefault, vel);
      return true;
    }
    if (direction === "up" && l.tipo === "saida") {
      if (!tentar("cobrancas")) return false; // dividir cria uma cobrança
      setSplitCtx({ lancamento: l, vel });
      return false;
    }
    return false;
  }

  // ── Atalhos de teclado: ← → ↑ ────────────────────────────
  const kb = useRef({});
  kb.current = { keyboardEnabled, top, modalOpen, handleSwipe };
  useEffect(() => {
    function onKeyDown(e) {
      const s = kb.current;
      if (!s.keyboardEnabled || !s.top || s.modalOpen) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable) return;
      const dir = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up" }[e.key];
      if (!dir) return;
      e.preventDefault();
      s.handleSwipe(dir, s.top);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex flex-col">
      {/* Saldo: texto simples; clicar abre o Painel */}
      <div>
        <div className="flex items-center gap-1 -ml-0.5">
          <span className="text-[13px] font-medium text-fg-2">Saldo</span>
          <EyeButton className="w-7 h-7" />
        </div>
        <button type="button" onClick={() => setMode("painel")} title={contas.map(c => `${c.nome}: ${brl(c.saldo)}`).join("\n")} className="block text-left">
          <span className={`text-[34px] leading-tight font-bold tracking-tight tabular-nums ${saldoContas < 0 && !ocultar ? "text-neg" : "text-fg"}`}>{brl(saldoContas)}</span>
        </button>
        {contas.length > 1 && <p className="text-[13px] text-fg-2">{contas.length} contas</p>}
      </div>

      {headerActions && <div className="mt-4 flex gap-2">{headerActions}</div>}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div className="inline-flex p-1 rounded-md bg-tile" role="tablist" aria-label="Visão">
          {[{ id: "painel", label: "Painel" }, { id: "contas", label: "Contas", badge: deck.length }].map(t => {
            const ativo = mode === t.id || (t.id === "contas" && mode === "revisar");
            return (
              <button key={t.id} type="button" role="tab" aria-selected={ativo} onClick={() => setMode(t.id)} className={`px-4 py-1.5 rounded-sm text-[13px] font-medium whitespace-nowrap transition inline-flex items-center gap-1.5 ${ativo ? "bg-surface text-fg shadow" : "text-fg-2 hover:text-fg"}`}>
                {t.label}
                {t.badge > 0 && <span className="text-[12px] tabular-nums text-fg-3">{t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {mode === "contas" && deck.length > 0 && (
        <p className="mt-3 text-[13px] text-fg-2">
          {deck.length} {deck.length === 1 ? "lançamento" : "lançamentos"} nos próximos 7 dias
          {totalPagar > 0 && <> · <span className="text-fg font-medium tabular-nums">{brl(totalPagar)}</span> a pagar</>}
          {totalReceber > 0 && <> · <span className="text-pos font-medium tabular-nums">{brl(totalReceber)}</span> a receber</>}
        </p>
      )}
      {mode === "revisar" && revisaoDeck.length > 0 && (
        <p className="mt-3 text-[13px] text-fg-2">Fixos e gastos dos últimos 30 dias · {revisaoDeck.length} pra revisar</p>
      )}

      {mode === "painel" ? (
        <div className="mt-5">
          {!isDesktop && <div className="mb-5"><DecisoesCard stats={stats} compact /></div>}
          <PainelPanel finance={finance} isDesktop={isDesktop} />
        </div>
      ) : items.length > 0 ? (
        <div className="mt-4 flex flex-col">
          <div className="relative w-full" style={{ height: isDesktop ? 400 : "clamp(300px, 46dvh, 400px)" }}>
            <AnimatePresence custom={swipeExit}>
              {items.slice(-3).reverse().map((it, i, arr) => {
                const isTop = i === 0;
                const cat = findCategoria(categorias, it.categoria);
                const itemLabels = mode === "revisar" ? LABELS_REVISAO : it.tipo === "entrada" ? LABELS_ENTRADA : LABELS_SAIDA;
                return (
                  <SwipeCard key={it.id || it.key} item={it} isTop={isTop} stackIndex={arr.length - 1 - i} onSwipe={handleSwipe} labels={itemLabels}>
                    {mode === "revisar" ? <RevisaoCardContent item={it} categoria={cat} /> : <LancamentoCardContent lancamento={it} categoria={cat} />}
                  </SwipeCard>
                );
              })}
            </AnimatePresence>
          </div>
          <div className="pt-7 flex items-center justify-center">
            <ActionButtons labels={labels} onAction={(dir) => top && handleSwipe(dir, top)} disabled={!top || modalOpen} />
          </div>
        </div>
      ) : mode === "contas" ? (
        <DeckVazio stats={stats} onNavigate={onNavigate} onRevisar={() => setMode("revisar")} />
      ) : (
        <ResumoRevisao itens={itensTodos} revisoes={revisoes} onRecomecar={finance.limparRevisoes} onVoltar={() => setMode("contas")} />
      )}

      <AnimatePresence>
        {payCtx && (
          <ContaPickerSheet
            key="pay"
            lancamento={payCtx.lancamento}
            contas={contas}
            contaPadrao={contaPadrao}
            onClose={() => setPayCtx(null)}
            onConfirm={(contaId) => { const { lancamento, vel } = payCtx; setPayCtx(null); confirmarPagamento(lancamento, contaId, vel); }}
          />
        )}
        {splitCtx && (
          <DividirSheet
            key="split"
            lancamento={splitCtx.lancamento}
            contas={contas}
            contaPadrao={contaPadrao}
            onClose={() => setSplitCtx(null)}
            onConfirm={(partes, contaId) => { const { lancamento, vel } = splitCtx; setSplitCtx(null); confirmarDivisao(lancamento, partes, contaId, vel); }}
          />
        )}
      </AnimatePresence>
      {snoozeCtx && (
        <SnoozeSetupModal onChoose={(pref) => {
          const { lancamento, vel } = snoozeCtx;
          setSnoozeDefault(pref); setSnoozeAsked(true); setSnoozeCtx(null);
          confirmarAdiamento(lancamento, pref, vel);
        }} />
      )}
    </div>
  );
}

function ContaOption({ conta, selected, onSelect }) {
  const [ocultar] = useOcultarValores();
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`w-full flex items-center justify-between rounded-md border px-4 py-3 text-left transition ${selected ? "border-brand bg-brand/[0.06]" : "border-line bg-surface hover:bg-tile"}`}>
      <span className="text-sm font-medium text-fg">{conta.nome}</span>
      <span className={`text-[13px] tabular-nums ${conta.saldo < 0 && !ocultar ? "text-neg" : "text-fg-2"}`}>{formatBRL(conta.saldo, { oculto: ocultar })}</span>
    </button>
  );
}

export function ContaPickerSheet({ lancamento, contas, contaPadrao, onClose, onConfirm }) {
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const entrada = lancamento.tipo === "entrada";
  const [ocultar] = useOcultarValores();
  return (
    <Sheet title={entrada ? "Recebeu em qual conta?" : "Pagou com qual conta?"} kicker={lancamento.descricao} onClose={onClose}>
      <div className="flex flex-col gap-2 mb-4">
        {contas.map(c => <ContaOption key={c.id} conta={c} selected={c.id === contaId} onSelect={() => setContaId(c.id)} />)}
      </div>
      <button type="button" onClick={() => onConfirm(contaId)} className={`${btnCls.primary} w-full py-3 text-sm`}>
        {entrada ? "Recebi" : "Paguei"} {formatBRL(lancamento.valor, { oculto: ocultar })}
      </button>
    </Sheet>
  );
}

function DividirSheet({ lancamento, contas, contaPadrao, onClose, onConfirm }) {
  const [partes, setPartes] = useState(2);
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const [minha, ...outras] = splitCents(lancamento.valor, partes);
  const [ocultar] = useOcultarValores();
  const brl = (v) => formatBRL(v, { oculto: ocultar });
  const stepper = "w-8 h-8 rounded-md border border-line bg-surface text-fg flex items-center justify-center hover:bg-tile transition";
  return (
    <Sheet title="Dividir conta" kicker={`${lancamento.descricao} · ${brl(lancamento.valor)}`} onClose={onClose}>
      <p className="text-[13px] text-fg-2 mb-4 leading-relaxed">Você paga o total agora e cobra a parte dos outros. Só a sua parte entra nos seus gastos.</p>
      <div className="flex items-center justify-between rounded-md border border-line px-4 py-3 mb-3">
        <span className="text-sm text-fg-2">Dividir entre</span>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Menos pessoas" onClick={() => setPartes(p => Math.max(2, p - 1))} className={stepper}><Minus size={16} strokeWidth={ICON_STROKE} aria-hidden /></button>
          <span className="text-base font-semibold text-fg tabular-nums w-20 text-center">{partes} pessoas</span>
          <button type="button" aria-label="Mais pessoas" onClick={() => setPartes(p => Math.min(20, p + 1))} className={stepper}><Plus size={16} strokeWidth={ICON_STROKE} aria-hidden /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-md border border-line px-4 py-3"><p className="text-[13px] text-fg-2 mb-1">Sua parte</p><p className="text-base font-semibold text-fg tabular-nums">{brl(minha)}</p></div>
        <div className="rounded-md border border-line px-4 py-3"><p className="text-[13px] text-fg-2 mb-1">A receber</p><p className="text-base font-semibold text-fg tabular-nums">{brl(outras.reduce((a, b) => a + b, 0))}</p><p className="text-[12px] text-fg-3">{brl(outras[0])} por pessoa</p></div>
      </div>
      {contas.length > 1 && (
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-[13px] font-medium text-fg-2">Pagou com</p>
          {contas.map(c => <ContaOption key={c.id} conta={c} selected={c.id === contaId} onSelect={() => setContaId(c.id)} />)}
        </div>
      )}
      <button type="button" onClick={() => onConfirm(partes, contaId)} className={`${btnCls.primary} w-full py-3 text-sm`}>Paguei e vou dividir</button>
    </Sheet>
  );
}

function DeckVazio({ stats, onNavigate, onRevisar }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center justify-center px-2 py-10 text-center max-w-md mx-auto w-full">
      <span className="w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center mb-4" aria-hidden><CircleCheck size={24} strokeWidth={ICON_STROKE} /></span>
      <h3 className="text-xl font-semibold text-fg mb-1.5">Tudo em dia</h3>
      <p className="text-fg-2 text-sm mb-6 leading-relaxed">Nenhuma conta vencendo nos próximos 7 dias.</p>
      <div className="w-full grid grid-cols-3 gap-2 mb-6">
        {[{ label: "Pagas", value: stats.accepted }, { label: "Adiadas", value: stats.rejected }, { label: "Divididas", value: stats.shared }].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center bg-surface border border-line rounded-lg px-3 py-3">
            <span className="text-xl font-semibold text-fg tabular-nums">{value}</span>
            <span className="text-[12px] text-fg-2 mt-0.5">{label} no mês</span>
          </div>
        ))}
      </div>
      <div className="w-full flex flex-col gap-2">
        <button type="button" onClick={() => onNavigate("create")} className={`${btnCls.primary} w-full py-3 text-sm`}><Plus size={18} strokeWidth={ICON_STROKE} aria-hidden />Novo lançamento</button>
        <div className="flex gap-2">
          <button type="button" onClick={onRevisar} className={`${btnCls.secondary} flex-1 py-3 text-sm`}><Scissors size={16} strokeWidth={ICON_STROKE} aria-hidden />Revisar gastos</button>
          <button type="button" onClick={() => onNavigate("activity")} className={`${btnCls.secondary} flex-1 py-3 text-sm`}>Ver atividade</button>
        </div>
      </div>
    </motion.div>
  );
}

function ResumoRevisao({ itens, revisoes, onRecomecar, onVoltar }) {
  const { total, cortes } = economiaPotencial(itens, revisoes);
  const revisados = itens.filter(it => revisoes[it.key]).length;
  const [ocultar] = useOcultarValores();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center justify-center px-2 py-10 text-center max-w-md mx-auto w-full">
      {itens.length === 0 ? (
        <>
          <span className="w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center mb-4" aria-hidden><Receipt size={24} strokeWidth={ICON_STROKE} /></span>
          <h3 className="text-xl font-semibold text-fg mb-1.5">Nada pra revisar ainda</h3>
          <p className="text-fg-2 text-sm mb-6 leading-relaxed">Cadastre gastos fixos ou pague algumas contas — eles aparecem aqui pra você decidir o que vale a pena.</p>
        </>
      ) : (
        <>
          <p className="text-[13px] text-fg-2 mb-3">Revisão concluída · {revisados} {revisados === 1 ? "item" : "itens"}</p>
          <p className="text-fg-2 text-sm mb-1">Você poderia economizar</p>
          <p className={`text-[40px] font-bold tabular-nums leading-none mb-1 ${total > 0 ? "text-pos" : "text-fg"}`}>{formatBRL(total, { oculto: ocultar })}</p>
          <p className="text-fg-2 text-sm mb-5">por mês</p>
          {cortes.length > 0 ? (
            <div className="w-full rounded-lg bg-surface border border-line divide-y divide-line mb-5 text-left">
              {cortes.map(c => (
                <div key={c.key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] text-fg truncate">{c.nome}</span>
                  <span className="text-[13px] text-fg-2 tabular-nums flex-shrink-0 ml-3">{formatBRL(c.valorMensal, { oculto: ocultar })}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-fg-2 text-sm mb-5">Tudo valeu a pena — nada pra cortar.</p>}
          <p className="text-[12px] text-fg-3 mb-5 leading-relaxed">Fixos contam o valor mensal; gastos avulsos dos últimos 30 dias entram como estimativa do que se repete por mês.</p>
        </>
      )}
      <div className="w-full flex gap-2">
        <button type="button" onClick={onVoltar} className={`${btnCls.secondary} flex-1 py-3 text-sm`}>Voltar às contas</button>
        {itens.length > 0 && <button type="button" onClick={onRecomecar} className={`${btnCls.secondary} flex-1 py-3 text-sm`}>Revisar de novo</button>}
      </div>
    </motion.div>
  );
}
