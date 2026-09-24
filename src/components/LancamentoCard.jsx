import { formatBRL } from "../lib/money.js";
import { formatDateShort, todayKey } from "../lib/dates.js";
import { vencimentoInfo } from "../lib/finance.js";

// Conteúdo do card de lançamento no deck (vai dentro de <SwipeCard>).
export function LancamentoCardContent({ lancamento: l, categoria }) {
  const venc = vencimentoInfo(l.data, todayKey(), l.tipo);
  const entrada = l.tipo === "entrada";
  return (
    <>
      <div className="absolute top-5 left-5 z-10 flex flex-col items-start gap-1.5">
        <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">{categoria.nome}</span>
        {entrada && <span className="text-[10px] font-semibold bg-emerald-400/25 text-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300/30">A receber</span>}
        {l.recorrenteId && <span className="text-[10px] font-semibold bg-black/25 text-white/75 px-2.5 py-1 rounded-full border border-white/10">🔁 Fixo</span>}
        {l.dividaId && <span className="text-[10px] font-semibold bg-black/25 text-white/75 px-2.5 py-1 rounded-full border border-white/10">💳 Parcela de dívida</span>}
        {l.parcela && <span className="text-[10px] font-semibold bg-black/25 text-white/75 px-2.5 py-1 rounded-full border border-white/10">Parcela {l.parcela.numero}/{l.parcela.total}</span>}
      </div>
      <div className="absolute right-5 top-5 z-10 text-4xl filter drop-shadow-lg">{categoria.icon}</div>

      {l.voltou && (
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap shadow-lg">⏰ De volta!</span>
        </div>
      )}

      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 text-center px-6 pointer-events-none">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/55 mb-1">{entrada ? "Entrada" : "A pagar"}</p>
        <p className="text-[44px] leading-none font-black text-white tracking-tight tabular-nums drop-shadow-lg">{formatBRL(l.valor)}</p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2 leading-tight truncate">{l.descricao || categoria.nome}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${venc.atrasado ? "bg-red-500/35 text-red-100 animate-pulse" : venc.dias === 0 ? "bg-amber-400/30 text-amber-100" : "bg-black/25 text-white/80"}`}>
            {venc.atrasado ? "⚠️" : "🗓"} {venc.label}
          </span>
          {l.data && <span className="text-[11px] text-white/55">{formatDateShort(l.data)}</span>}
        </div>
      </div>
    </>
  );
}

// Conteúdo do card no modo "Revisar gastos".
export function RevisaoCardContent({ item, categoria }) {
  return (
    <>
      <div className="absolute top-5 left-5 z-10 flex flex-col items-start gap-1.5">
        <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">{categoria.nome}</span>
        <span className="text-[10px] font-semibold bg-black/25 text-white/75 px-2.5 py-1 rounded-full border border-white/10">
          {item.origem === "fixo" ? (item.frequencia === "semanal" ? "🔁 Fixo semanal" : "🔁 Fixo mensal") : `Gasto de ${formatDateShort(item.data)}`}
        </span>
      </div>
      <div className="absolute right-5 top-5 z-10 text-4xl filter drop-shadow-lg">{categoria.icon}</div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 text-center px-6 pointer-events-none">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/55 mb-1">{item.origem === "fixo" ? "Por mês" : "Gasto"}</p>
        <p className="text-[44px] leading-none font-black text-white tracking-tight tabular-nums drop-shadow-lg">{formatBRL(item.valorMensal)}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5 leading-tight truncate">{item.nome || categoria.nome}</h2>
        <p className="text-sm text-white/65">Valeu a pena?</p>
      </div>
    </>
  );
}
