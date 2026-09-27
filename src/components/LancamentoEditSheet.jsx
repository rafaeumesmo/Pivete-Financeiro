import { useState } from "react";
import { Sheet } from "./Sheet.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { formatDateShort } from "../lib/dates.js";

// Editar/excluir/estornar um lançamento (Calendário e Extrato).
// Pago: só descrição e categoria mudam (valor/data já mexeram em saldo).
export function LancamentoEditSheet({ lancamento: l, categorias, contas, finance, onClose, showToast }) {
  const pago = l.status === "pago";
  const [f, setF] = useState({ valor: l.valor, descricao: l.descricao || "", categoria: l.categoria, data: l.data || "" });
  const conta = contas.find(c => c.id === l.contaId);

  function salvar() {
    const patch = { descricao: f.descricao.trim() || l.descricao, categoria: f.categoria };
    if (!pago) {
      if (f.valor <= 0) { showToast("Informe o valor.", "bg-red-600/90"); return; }
      Object.assign(patch, { valor: f.valor, data: f.data || null });
    }
    finance.atualizarLancamento(l.id, patch);
    showToast("Lançamento atualizado", "bg-emerald-600/90");
    onClose();
  }

  function excluir() {
    const aviso = pago ? `\n\nO valor (${formatBRL(l.valor)}) volta pra conta ${conta?.nome || ""}${l.dividaId ? " e pro saldo da dívida" : ""}.` : "";
    if (!window.confirm(`Excluir "${l.descricao}"?${aviso}`)) return;
    finance.removerLancamento(l.id);
    showToast("Lançamento excluído", "bg-white/10");
    onClose();
  }

  function estornar() {
    if (!finance.estornar(l.id)) return;
    showToast("Pagamento desfeito — voltou pra pendente", "bg-amber-600/90");
    onClose();
  }

  return (
    <Sheet title="Editar lançamento" kicker={l.tipo === "entrada" ? "Entrada" : "Saída"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {pago && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-[12px] text-emerald-200/80">
            ✓ {l.tipo === "entrada" ? "Recebido" : "Pago"} {l.pagoEm ? `em ${formatDateShort(l.pagoEm.slice(0, 10))}` : ""}{conta ? ` · ${conta.nome}` : ""}
            {l.divisao && <span className="block text-white/50 mt-1">Dividido em {l.divisao.partes} · sua parte {formatBRL(l.divisao.minhaParte)}</span>}
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="ed-valor">Valor</label>
          {pago
            ? <p className="text-2xl font-black text-white tabular-nums">{formatBRL(l.valor)}</p>
            : <MoneyInput id="ed-valor" value={f.valor} onChange={valor => setF(p => ({ ...p, valor }))} className={`${inputCls} text-xl font-bold`} />}
        </div>
        <div>
          <label className={labelCls} htmlFor="ed-desc">Descrição</label>
          <input id="ed-desc" value={f.descricao} maxLength={60} onChange={e => setF(p => ({ ...p, descricao: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="ed-cat">Categoria</label>
          <select id="ed-cat" value={f.categoria} onChange={e => setF(p => ({ ...p, categoria: e.target.value }))} className={`${inputCls} bg-sheet`}>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.icon} {c.nome}</option>)}
          </select>
        </div>
        {!pago && (
          <div>
            <label className={labelCls} htmlFor="ed-data">{l.tipo === "entrada" ? "Data prevista" : "Vencimento"}</label>
            <input id="ed-data" type="date" value={f.data} onChange={e => setF(p => ({ ...p, data: e.target.value }))} className={`${inputCls} [color-scheme:dark]`} />
          </div>
        )}
        <button type="button" onClick={salvar} className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition">Salvar</button>
        <div className="flex gap-2">
          {pago && <button type="button" onClick={estornar} className="flex-1 rounded-2xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-[13px] text-amber-300 hover:bg-amber-500/20 transition">Desfazer pagamento</button>}
          <button type="button" onClick={excluir} className="flex-1 rounded-2xl border border-red-500/25 bg-red-500/10 py-2.5 text-[13px] text-red-300 hover:bg-red-500/20 transition">Excluir</button>
        </div>
      </div>
    </Sheet>
  );
}
