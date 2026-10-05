import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FinCalendar } from "./FinCalendar.jsx";
import { CaixinhasPanel } from "./CaixinhasPanel.jsx";
import { FixosDividasPanel } from "./FixosDividasPanel.jsx";
import { ExtratoPanel } from "./ExtratoPanel.jsx";
import { LancamentoEditSheet } from "./LancamentoEditSheet.jsx";
import { ContaPickerSheet } from "./FinDeck.jsx";
import { formatBRL } from "../lib/money.js";
import { jurosAlto } from "../lib/finance.js";

// Aba Atividade: 4 sub-abas (ex-Calendário/Listas/Status/Compromissos/Histórico).
export function ActivityTab({ finance, showToast, onPago }) {
  const [subTab, setSubTab] = useState("calendario");
  const [editando, setEditando] = useState(null);
  const [pagando, setPagando] = useState(null);
  const { metas, dividas, recorrentes, contas } = finance;

  function pagar(l, contaId) {
    const r = finance.pagar(l.id, contaId);
    showToast(l.tipo === "entrada" ? `Recebido ${formatBRL(l.valor)}` : `Pago ${formatBRL(l.valor)}`, "bg-emerald-600/90");
    onPago?.(l, r);
  }

  function pedirPagamento(l) {
    if (contas.length > 1) setPagando(l);
    else pagar(l, contas[0]?.id);
  }

  const tabs = [
    { id: "calendario", label: "Calendário" },
    { id: "caixinhas",  label: "Caixinhas" },
    { id: "fixos",      label: "Fixos & Dívidas",  badge: dividas.filter(d => d.saldoDevedor > 0 && jurosAlto(d)).length },
    { id: "extrato",    label: "Extrato" },
  ];
  const counts = { caixinhas: metas.length, fixos: recorrentes.length + dividas.length };

  return (
    <motion.div className="h-full overflow-y-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="px-5 pt-5">
        <h2 className="font-semibold text-fg text-xl">Atividade</h2>
      </div>

      <div className="px-5 pt-4">
        <div className="flex gap-1 bg-tile p-1 rounded-md overflow-x-auto" role="tablist">
          {tabs.map(tab => (
            <button key={tab.id} role="tab" aria-selected={subTab === tab.id} onClick={() => setSubTab(tab.id)}
              className={`relative flex-shrink-0 px-3.5 py-1.5 rounded-sm text-[13px] font-medium transition whitespace-nowrap ${subTab === tab.id ? "bg-surface text-fg shadow" : "text-fg-2 hover:text-fg"}`}>
              {tab.label}
              {counts[tab.id] > 0 && <span className="ml-1 text-[12px] text-fg-3 tabular-nums">{counts[tab.id]}</span>}
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-sm bg-neg text-on-brand text-[11px] font-semibold flex items-center justify-center px-[3px]">{tab.badge > 9 ? "9+" : tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 pb-10">
        {subTab === "calendario" && <FinCalendar finance={finance} onPagar={pedirPagamento} onEditar={setEditando} />}
        {subTab === "caixinhas"  && <CaixinhasPanel finance={finance} showToast={showToast} onActivity={() => onPago?.(null, {})} />}
        {subTab === "fixos"      && <FixosDividasPanel finance={finance} showToast={showToast} />}
        {subTab === "extrato"    && <ExtratoPanel finance={finance} onEditar={setEditando} />}
      </div>

      <AnimatePresence>
        {editando && (
          <LancamentoEditSheet key={editando.id} lancamento={editando} categorias={finance.categorias} contas={contas} finance={finance} showToast={showToast} onClose={() => setEditando(null)} />
        )}
        {pagando && (
          <ContaPickerSheet key="pagar" lancamento={pagando} contas={contas} contaPadrao={finance.contaPadrao} onClose={() => setPagando(null)}
            onConfirm={contaId => { const l = pagando; setPagando(null); pagar(l, contaId); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
