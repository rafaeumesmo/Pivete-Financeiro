import { formatBRL } from "../lib/money.js";
import { useOcultarValores } from "../lib/privacy.js";
import { formatDateShort, todayKey } from "../lib/dates.js";
import { vencimentoInfo, custoEfetivo } from "../lib/finance.js";

// Linha de lançamento usada no Calendário e no Extrato. Clicar abre a edição;
// `actions` (opcional) aparece à direita, antes do valor.
export function LancamentoRow({ lancamento: l, categoria, onClick, actions, showDate = false, previsto = false }) {
  const [ocultar] = useOcultarValores();
  const entrada = l.tipo === "entrada";
  const pago = l.status === "pago";
  const venc = !pago && l.data ? vencimentoInfo(l.data, todayKey(), l.tipo) : null;
  const status = previsto ? { txt: "Previsto", cls: "text-white/30" }
    : pago ? { txt: entrada ? "Recebido" : "Pago", cls: "text-emerald-400/80" }
    : l.status === "adiado" ? { txt: "Adiado", cls: "text-amber-400/80" }
    : venc?.atrasado ? { txt: venc.label, cls: "text-red-400" }
    : { txt: entrada ? "A receber" : "A pagar", cls: "text-white/40" };
  return (
    <div className={`flex items-center gap-3 px-3.5 py-3 ${previsto ? "opacity-60" : ""}`}>
      <button type="button" onClick={onClick} disabled={!onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${categoria.cor}26` }} aria-hidden>{categoria.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-white truncate">{l.descricao || categoria.nome}</span>
          <span className="block text-[11px] text-white/35 truncate">
            <span className={status.cls}>{status.txt}</span>
            {showDate && l.data && ` · ${formatDateShort(l.data)}`}
            {l.parcela && ` · ${l.parcela.numero}/${l.parcela.total}`}
            {l.recorrenteId && " · 🔁"}
            {l.divisao && ` · ÷${l.divisao.partes}`}
          </span>
        </span>
      </button>
      {actions}
      <span className={`text-[13px] font-semibold tabular-nums flex-shrink-0 ${entrada ? "text-emerald-400" : pago ? "text-white/60" : "text-white"}`}>
        {entrada ? "+" : "−"}{formatBRL(entrada ? l.valor : custoEfetivo(l), { oculto: ocultar })}
      </span>
    </div>
  );
}
