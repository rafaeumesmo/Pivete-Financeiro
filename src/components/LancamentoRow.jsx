import { formatBRL } from "../lib/money.js";
import { useOcultarValores } from "../lib/privacy.js";
import { formatDateShort, todayKey } from "../lib/dates.js";
import { vencimentoInfo, custoEfetivo } from "../lib/finance.js";
import { CategoryTile } from "./CategoryTile.jsx";

// Linha de lançamento usada no Calendário e no Extrato. Clicar abre a edição;
// `actions` (opcional) aparece à direita, antes do valor.
export function LancamentoRow({ lancamento: l, categoria, onClick, actions, showDate = false, previsto = false }) {
  const [ocultar] = useOcultarValores();
  const entrada = l.tipo === "entrada";
  const pago = l.status === "pago";
  const venc = !pago && l.data ? vencimentoInfo(l.data, todayKey(), l.tipo) : null;
  const status = previsto ? { txt: "Previsto", cls: "text-fg-3" }
    : pago ? { txt: entrada ? "Recebido" : "Pago", cls: "text-pos" }
    : l.status === "adiado" ? { txt: "Adiado", cls: "text-warn" }
    : venc?.atrasado ? { txt: venc.label, cls: "text-neg" }
    : { txt: entrada ? "A receber" : "A pagar", cls: "text-fg-2" };
  return (
    <div className={`flex items-center gap-3 px-3.5 py-3 ${previsto ? "opacity-60" : ""}`}>
      <button type="button" onClick={onClick} disabled={!onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <CategoryTile categoria={categoria} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-fg truncate">{l.descricao || categoria.nome}</span>
          <span className="block text-[12px] text-fg-3 truncate">
            <span className={status.cls}>{status.txt}</span>
            {showDate && l.data && ` · ${formatDateShort(l.data)}`}
            {l.parcela && ` · ${l.parcela.numero}/${l.parcela.total}`}
            {l.recorrenteId && " · Fixo"}
            {l.divisao && ` · ÷${l.divisao.partes}`}
          </span>
        </span>
      </button>
      {actions}
      <span className={`text-[13px] font-semibold tabular-nums flex-shrink-0 ${entrada ? "text-pos" : pago ? "text-fg-2" : "text-fg"}`}>
        {entrada ? "+" : "−"}{formatBRL(entrada ? l.valor : custoEfetivo(l), { oculto: ocultar })}
      </span>
    </div>
  );
}
