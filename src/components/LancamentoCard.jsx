import { TriangleAlert } from "lucide-react";
import { formatBRL } from "../lib/money.js";
import { formatDateShort, todayKey } from "../lib/dates.js";
import { vencimentoInfo } from "../lib/finance.js";
import { useOcultarValores } from "../lib/privacy.js";
import { ICON_STROKE } from "../lib/icons.js";
import { CategoryTile } from "./CategoryTile.jsx";

// Conteúdo dos cards do deck (vão dentro de <SwipeCard>, fundo de marca).
// Tudo em text-on-brand: "white" é a tinta do tema e escurece no claro.
function CardLayout({ categoria, topRight, valor, valorSub, titulo, meta, alerta }) {
  return (
    <div className="relative z-10 h-full flex flex-col justify-between p-5 text-on-brand pointer-events-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <CategoryTile categoria={categoria} size={36} onBrand />
        <span className="text-[13px] font-medium text-on-brand/80 truncate flex-1">{categoria.nome}</span>
        {topRight && <span className="text-[13px] font-medium text-on-brand/80 flex-shrink-0">{topRight}</span>}
      </div>

      <div className="text-center px-2">
        <p className="text-[40px] leading-none font-bold tracking-tight tabular-nums">{valor}</p>
        {valorSub && <p className="text-[13px] text-on-brand/70 mt-2">{valorSub}</p>}
      </div>

      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-snug truncate">{titulo}</h2>
        <p className="text-[13px] text-on-brand/70 mt-0.5 flex items-center gap-1.5 min-w-0">
          {alerta && <TriangleAlert size={14} strokeWidth={ICON_STROKE} className="flex-shrink-0" aria-hidden />}
          <span className="truncate">{meta.filter(Boolean).join(" · ")}</span>
        </p>
      </div>
    </div>
  );
}

export function LancamentoCardContent({ lancamento: l, categoria }) {
  const [ocultar] = useOcultarValores();
  const venc = vencimentoInfo(l.data, todayKey(), l.tipo);
  const entrada = l.tipo === "entrada";
  return (
    <CardLayout
      categoria={categoria}
      topRight={entrada ? "A receber" : null}
      valor={formatBRL(l.valor, { oculto: ocultar })}
      titulo={l.descricao || categoria.nome}
      alerta={venc.atrasado}
      meta={[
        l.voltou && "De volta",
        venc.label,
        l.data && formatDateShort(l.data),
        l.recorrenteId && "Fixo",
        l.dividaId && "Parcela de dívida",
        l.parcela && `Parcela ${l.parcela.numero}/${l.parcela.total}`,
      ]}
    />
  );
}

// Conteúdo do card no modo "Revisar gastos".
export function RevisaoCardContent({ item, categoria }) {
  const [ocultar] = useOcultarValores();
  const fixo = item.origem === "fixo";
  return (
    <CardLayout
      categoria={categoria}
      valor={formatBRL(item.valorMensal, { oculto: ocultar })}
      valorSub={fixo ? "por mês" : null}
      titulo={item.nome || categoria.nome}
      meta={[
        fixo ? (item.frequencia === "semanal" ? "Fixo semanal" : "Fixo mensal") : formatDateShort(item.data),
        "Valeu a pena?",
      ]}
    />
  );
}
