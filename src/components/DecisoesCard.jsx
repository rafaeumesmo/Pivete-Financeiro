import { motion } from "framer-motion";

// "Decisões do mês" (antes no rodapé da sidebar). Números em texto primário;
// a única cor é a barra de progresso.
export function DecisoesCard({ stats, compact = false }) {
  const total = stats.accepted + stats.rejected + stats.shared;
  const pct = total > 0 ? Math.round((stats.accepted / total) * 100) : null;
  const barra = (
    <div className="h-1.5 rounded-sm bg-tile overflow-hidden" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Pagas sem adiar">
      <motion.div className="h-full rounded-sm bg-brand" animate={{ width: `${pct ?? 0}%` }} transition={{ type: "spring", stiffness: 100, damping: 20 }} />
    </div>
  );
  // Versão compacta (topo do Painel no mobile/tablet): uma linha de números.
  if (compact) {
    return (
      <section className="rounded-lg border border-line bg-surface px-4 py-3.5">
        <h2 className="text-[13px] font-medium text-fg-2 mb-2">Decisões do mês</h2>
        <dl className="grid grid-cols-4 gap-2 mb-3">
          {[{ label: "Pagas", value: stats.accepted }, { label: "Divididas", value: stats.shared }, { label: "Adiadas", value: stats.rejected }, { label: "Sem adiar", value: pct === null ? "—" : `${pct}%` }].map(({ label, value }) => (
            <div key={label} className="min-w-0 flex flex-col-reverse">
              <dt className="text-[12px] text-fg-2 truncate">{label}</dt>
              <dd className="text-[17px] font-semibold text-fg tabular-nums leading-tight">{value}</dd>
            </div>
          ))}
        </dl>
        {barra}
      </section>
    );
  }
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-fg mb-4">Decisões do mês</h2>
      <dl className="grid grid-cols-3 gap-3 mb-5">
        {[{ label: "Pagas", value: stats.accepted }, { label: "Divididas", value: stats.shared }, { label: "Adiadas", value: stats.rejected }].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[13px] text-fg-2">{label}</dt>
            <dd className="text-2xl font-semibold text-fg tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] text-fg-2">Pagas sem adiar</span>
        <span className="text-[13px] font-semibold text-fg tabular-nums">{pct === null ? "—" : `${pct}%`}</span>
      </div>
      {barra}
    </section>
  );
}
