import { CategoryTile } from "./CategoryTile.jsx";
import { findCategoria } from "../lib/categories.js";
import { formatBRL } from "../lib/money.js";
import { formatDateShort } from "../lib/dates.js";
import { custoEfetivo } from "../lib/finance.js";
import { useOcultarValores } from "../lib/privacy.js";

// Últimos lançamentos pagos/recebidos (mesmos dados do Extrato), mais
// recentes primeiro.
export function RecentActivity({ finance, limit = 5, onVerTudo }) {
  const { lancamentos, categorias } = finance;
  const [ocultar] = useOcultarValores();
  const quando = (l) => l.pagoEm || l.data || "";
  const lista = lancamentos
    .filter(l => l.status === "pago")
    .sort((a, b) => (quando(a) < quando(b) ? 1 : quando(a) > quando(b) ? -1 : 0))
    .slice(0, limit);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[15px] font-semibold text-fg">Atividade recente</h2>
        {onVerTudo && lista.length > 0 && <button type="button" onClick={onVerTudo} className="text-[13px] font-medium text-brand-ink hover:underline">Ver tudo</button>}
      </div>
      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-6 text-center text-[13px] text-fg-2">Nada pago ou recebido ainda. O que você resolver no deck aparece aqui.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map(l => {
            const cat = findCategoria(categorias, l.categoria);
            const entrada = l.tipo === "entrada";
            const data = (l.pagoEm || l.data || "").slice(0, 10);
            return (
              <li key={l.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3">
                <CategoryTile categoria={cat} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-fg truncate">{l.descricao || cat.nome}</p>
                  <p className="text-[12px] text-fg-2">{data ? formatDateShort(data) : cat.nome}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-[14px] font-semibold tabular-nums ${entrada ? "text-pos" : "text-neg"}`}>
                    {entrada ? "+" : "−"}{formatBRL(entrada ? l.valor : custoEfetivo(l), { oculto: ocultar })}
                  </p>
                  <p className="text-[12px] text-fg-2">{entrada ? "Entrada" : "Saída"}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
