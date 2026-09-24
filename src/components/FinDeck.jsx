import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeCard } from "./SwipeCard.jsx";
import { LancamentoCardContent, RevisaoCardContent } from "./LancamentoCard.jsx";
import { ActionButtons } from "./ActionButtons.jsx";
import { SnoozeSetupModal } from "./SnoozeSetupModal.jsx";
import { Sheet } from "./Sheet.jsx";
import { PainelPanel } from "./PainelPanel.jsx";
import { findCategoria } from "../lib/categories.js";
import { formatBRL, splitCents } from "../lib/money.js";
import { computeSnoozeUntil, todayKey } from "../lib/dates.js";
import { deckLancamentos, itensRevisao, revisaoPendente, economiaPotencial } from "../lib/finance.js";

const LABELS_SAIDA   = { right: "Paguei", left: "Adiar", up: "Dividir" };
const LABELS_ENTRADA = { right: "Recebi", left: "Adiar" };
const LABELS_REVISAO = { right: "Valeu a pena", left: "Cortar" };

// Aba Início: deck de contas a pagar/receber (padrão), o Painel com os gráficos
// ou "Revisar gastos" (aberto pelo deck vazio).
export function FinDeck({
  finance, isDesktop, snoozeDefault, setSnoozeDefault, snoozeAsked, setSnoozeAsked,
  keyboardEnabled, onActivity, onDecision, onDividido, onQuitouDivida, onDeckComplete,
  onNavigate, showToast, stats,
}) {
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
    showToast(l.tipo === "entrada" ? `✓ Recebido ${formatBRL(l.valor)}` : `✓ Pago ${formatBRL(l.valor)}`, "bg-emerald-600/90 backdrop-blur-md");
    try { navigator.vibrate?.([30, 50, 30]); } catch {}
    if (quitouDivida) onQuitouDivida?.(l);
    if (willEmpty) onDeckComplete?.();
  }

  function confirmarAdiamento(l, pref, vel) {
    exit("left", vel);
    finance.adiar(l.id, computeSnoozeUntil(pref));
    registrar(l, "Adiei", "left");
    showToast("⏰  Adiado", "bg-amber-600/90 backdrop-blur-md");
    try { navigator.vibrate?.(30); } catch {}
  }

  function confirmarDivisao(l, partes, contaId, vel) {
    exit("up", vel);
    const dividido = finance.dividir(l.id, partes, contaId);
    registrar(l, "Dividi", "up");
    showToast(`↑ Dividido em ${partes} · ${formatBRL(dividido.divisao.porPessoa)} por pessoa`, "bg-blue-600/90 backdrop-blur-md");
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
      showToast(direction === "right" ? "👍 Valeu a pena" : `✂️ Cortar · ${formatBRL(item.valorMensal)}`, direction === "right" ? "bg-emerald-600/90 backdrop-blur-md" : "bg-red-600/90 backdrop-blur-md");
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

  const px = isDesktop ? "px-10" : "px-5";
  const cardBox = isDesktop ? "relative w-full max-w-[520px]" : "relative w-full h-full";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cabeçalho: modo + resumo */}
      <div className={`flex-shrink-0 ${px} ${isDesktop ? "pt-6" : "pt-1"} pb-3`}>
        <div className={`flex items-center gap-3 ${isDesktop ? "justify-between" : "flex-col items-stretch"}`}>
          <div className="flex bg-white/[0.05] border border-white/[0.07] p-1 rounded-xl" role="tablist">
            {[{ id: "painel", label: "Painel" }, { id: "contas", label: "Contas", badge: deck.length }].map(t => (
              <button key={t.id} role="tab" aria-selected={mode === t.id} onClick={() => setMode(t.id)} className={`flex-1 px-4 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition flex items-center justify-center gap-1.5 ${mode === t.id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"}`}>
                {t.label}
                {t.badge > 0 && <span className="text-[10px] tabular-nums text-white/40">{t.badge}</span>}
              </button>
            ))}
          </div>
          {mode === "contas" && deck.length > 0 && (
            <p className="text-[11px] text-white/35 text-center">
              {deck.length} {deck.length === 1 ? "lançamento" : "lançamentos"} até daqui 7 dias
              {totalPagar > 0 && <> · <span className="text-white/60 font-semibold tabular-nums">{formatBRL(totalPagar)}</span> a pagar</>}
              {totalReceber > 0 && <> · <span className="text-emerald-400/80 font-semibold tabular-nums">{formatBRL(totalReceber)}</span> a receber</>}
            </p>
          )}
          {mode === "revisar" && revisaoDeck.length > 0 && (
            <p className="text-[11px] text-white/35 text-center">Fixos e gastos dos últimos 30 dias · {revisaoDeck.length} pra revisar</p>
          )}
        </div>
      </div>

      {mode === "painel" ? (
        <div className={`flex-1 min-h-0 overflow-y-auto ${px} pt-2 pb-10`}>
          <div className={isDesktop ? "max-w-3xl mx-auto" : ""}>
            <PainelPanel finance={finance} isDesktop={isDesktop} />
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className={`flex-1 min-h-0 flex flex-col ${isDesktop ? "items-center justify-center gap-6 px-10 py-4" : ""}`}>
          <div className={isDesktop ? cardBox : `flex-1 min-h-0 ${px} pt-1 pb-2`} style={isDesktop ? { height: 420 } : undefined}>
            <div className={isDesktop ? "relative w-full h-full" : cardBox}>
              <AnimatePresence custom={swipeExit}>
                {items.slice(-3).reverse().map((it, i, arr) => {
                  const isTop = i === 0;
                  const cat = findCategoria(categorias, it.categoria);
                  const itemLabels = mode === "revisar" ? LABELS_REVISAO : it.tipo === "entrada" ? LABELS_ENTRADA : LABELS_SAIDA;
                  return (
                    <SwipeCard key={it.id || it.key} item={it} gradient={cat.gradient} isTop={isTop} stackIndex={arr.length - 1 - i} onSwipe={handleSwipe} labels={itemLabels}>
                      {mode === "revisar" ? <RevisaoCardContent item={it} categoria={cat} /> : <LancamentoCardContent lancamento={it} categoria={cat} />}
                    </SwipeCard>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
          <div className={`flex-shrink-0 flex items-center justify-between ${isDesktop ? "w-full max-w-[520px] px-2" : "px-8 py-2"}`}>
            <div className="flex items-center gap-1.5 text-red-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg><span className="text-[9px] font-semibold tracking-widest uppercase">{labels.left}</span></div>
            {labels.up && <div className="flex flex-col items-center text-blue-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mb-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg><span className="text-[9px] font-semibold tracking-widest uppercase">{labels.up}</span></div>}
            <div className="flex items-center gap-1.5 text-emerald-400/50"><span className="text-[9px] font-semibold tracking-widest uppercase">{labels.right}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></div>
          </div>
          <div className={`flex-shrink-0 flex items-center justify-center ${isDesktop ? "" : "pb-4"}`}>
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
  return (
    <button type="button" onClick={onSelect} className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-[#2563eb] bg-[#2563eb]/15" : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]"}`}>
      <span className="text-sm font-medium text-white">{conta.nome}</span>
      <span className={`text-[12px] tabular-nums ${conta.saldo < 0 ? "text-red-400" : "text-white/45"}`}>{formatBRL(conta.saldo)}</span>
    </button>
  );
}

export function ContaPickerSheet({ lancamento, contas, contaPadrao, onClose, onConfirm }) {
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const entrada = lancamento.tipo === "entrada";
  return (
    <Sheet title={entrada ? "Recebeu em qual conta?" : "Pagou com qual conta?"} kicker={lancamento.descricao} onClose={onClose}>
      <div className="flex flex-col gap-2 mb-4">
        {contas.map(c => <ContaOption key={c.id} conta={c} selected={c.id === contaId} onSelect={() => setContaId(c.id)} />)}
      </div>
      <button type="button" onClick={() => onConfirm(contaId)} className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition">
        {entrada ? "Recebi" : "Paguei"} {formatBRL(lancamento.valor)}
      </button>
    </Sheet>
  );
}

function DividirSheet({ lancamento, contas, contaPadrao, onClose, onConfirm }) {
  const [partes, setPartes] = useState(2);
  const [contaId, setContaId] = useState(contas.some(c => c.id === contaPadrao) ? contaPadrao : contas[0]?.id);
  const [minha, ...outras] = splitCents(lancamento.valor, partes);
  return (
    <Sheet title="Dividir conta" kicker={`${lancamento.descricao} · ${formatBRL(lancamento.valor)}`} onClose={onClose}>
      <p className="text-[12px] text-white/40 mb-4 leading-relaxed">Você paga o total agora e cobra a parte dos outros. Só a sua parte entra nos seus gastos.</p>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 mb-3">
        <span className="text-sm text-white/70">Dividir entre</span>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Menos pessoas" onClick={() => setPartes(p => Math.max(2, p - 1))} className="w-8 h-8 rounded-xl bg-white/[0.08] text-white text-lg leading-none">−</button>
          <span className="text-base font-bold text-white tabular-nums w-16 text-center">{partes} pessoas</span>
          <button type="button" aria-label="Mais pessoas" onClick={() => setPartes(p => Math.min(20, p + 1))} className="w-8 h-8 rounded-xl bg-white/[0.08] text-white text-lg leading-none">+</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Sua parte</p><p className="text-base font-bold text-white tabular-nums">{formatBRL(minha)}</p></div>
        <div className="rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/25 px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-[#93c5fd]/60 mb-1">A receber</p><p className="text-base font-bold text-[#93c5fd] tabular-nums">{formatBRL(outras.reduce((a, b) => a + b, 0))}</p><p className="text-[10px] text-white/35">{formatBRL(outras[0])} por pessoa</p></div>
      </div>
      {contas.length > 1 && (
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35">Pagou com</p>
          {contas.map(c => <ContaOption key={c.id} conta={c} selected={c.id === contaId} onSelect={() => setContaId(c.id)} />)}
        </div>
      )}
      <button type="button" onClick={() => onConfirm(partes, contaId)} className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition">Paguei e vou dividir</button>
    </Sheet>
  );
}

function DeckVazio({ stats, onNavigate, onRevisar }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-md mx-auto w-full">
      <div className="text-6xl mb-5">🎉</div>
      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Tudo em dia!</h3>
      <p className="text-white/40 text-sm mb-6 leading-relaxed">Nenhuma conta vencendo nos próximos 7 dias.</p>
      <div className="flex gap-3 mb-6">
        {[{ label: "Pagas", value: stats.accepted, color: "text-emerald-400" }, { label: "Adiadas", value: stats.rejected, color: "text-amber-400" }, { label: "Divididas", value: stats.shared, color: "text-blue-400" }].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-white/40 mt-0.5">{label}</span>
          </div>
        ))}
      </div>
      <div className="w-full flex flex-col gap-2">
        <motion.button onClick={() => onNavigate("create")} className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-white font-semibold text-sm hover:bg-blue-500 transition-colors" whileTap={{ scale: 0.97 }}>+ Novo lançamento</motion.button>
        <div className="flex gap-2">
          <motion.button onClick={onRevisar} className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 text-sm hover:text-white/80 transition" whileTap={{ scale: 0.97 }}>✂️ Revisar gastos</motion.button>
          <motion.button onClick={() => onNavigate("activity")} className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 text-sm hover:text-white/80 transition" whileTap={{ scale: 0.97 }}>Ver atividade</motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function ResumoRevisao({ itens, revisoes, onRecomecar, onVoltar }) {
  const { total, cortes } = economiaPotencial(itens, revisoes);
  const revisados = itens.filter(it => revisoes[it.key]).length;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: "spring" }} className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-md mx-auto w-full overflow-y-auto py-6">
      {itens.length === 0 ? (
        <>
          <div className="text-5xl mb-4">🧾</div>
          <h3 className="text-xl font-bold text-white mb-2">Nada pra revisar ainda</h3>
          <p className="text-white/40 text-sm mb-6 leading-relaxed">Cadastre gastos fixos ou pague algumas contas — eles aparecem aqui pra você decidir o que vale a pena.</p>
        </>
      ) : (
        <>
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/35 mb-2">Revisão concluída · {revisados} {revisados === 1 ? "item" : "itens"}</p>
          <p className="text-white/55 text-sm mb-1">Você poderia economizar</p>
          <p className={`text-[44px] font-black tabular-nums leading-none mb-1 ${total > 0 ? "text-emerald-400" : "text-white/70"}`}>{formatBRL(total)}</p>
          <p className="text-white/40 text-sm mb-5">por mês</p>
          {cortes.length > 0 ? (
            <div className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.07] divide-y divide-white/[0.05] mb-5 text-left">
              {cortes.map(c => (
                <div key={c.key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] text-white/75 truncate">✂️ {c.nome}</span>
                  <span className="text-[13px] text-white/55 tabular-nums flex-shrink-0 ml-3">{formatBRL(c.valorMensal)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-white/40 text-sm mb-5">Tudo valeu a pena — nada pra cortar. 👌</p>}
          <p className="text-[11px] text-white/25 mb-5 leading-relaxed">Fixos contam o valor mensal; gastos avulsos dos últimos 30 dias entram como estimativa do que se repete por mês.</p>
        </>
      )}
      <div className="w-full flex gap-2">
        <button onClick={onVoltar} className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white/60 text-sm hover:text-white/80 transition">Voltar às contas</button>
        {itens.length > 0 && <button onClick={onRecomecar} className="flex-1 py-3 rounded-2xl bg-white/[0.08] text-white text-sm font-semibold hover:bg-white/[0.12] transition">Revisar de novo</button>}
      </div>
    </motion.div>
  );
}
