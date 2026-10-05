import { useEffect, useState } from "react";
import { Receipt, Share2, X, Sparkles } from "lucide-react";
import { Sheet } from "./Sheet.jsx";
import { btnCls } from "./ui.jsx";
import { ICON_STROKE } from "../lib/icons.js";
import { estatisticasMes, tituloDoMes, nomeDoMes, nomeMesCurto, conviteTexto } from "../lib/recibo.js";
import { buildReciboImage } from "../lib/reciboImagem.js";
import { carregarFonte, compartilharCanvas } from "../lib/canvasImagem.js";
import { contarBoraNoMes } from "../lib/polls.js";

// Recibo do mês (grátis, também pra convidado). `dados` = { decisions,
// revisoes, conquistas, categorias } do aparelho; nada em R$ sai daqui.

// Aviso na Início, do dia 1 ao 7: recibo pronto, ou convite se o mês teve
// pouco uso. Não é modal.
export function ReciboAviso({ ym, suficiente, onAbrir, onDispensar }) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      {suficiente
        ? <Receipt size={18} strokeWidth={ICON_STROKE} className="text-brand-ink flex-shrink-0" aria-hidden />
        : <Sparkles size={18} strokeWidth={ICON_STROKE} className="text-fg-2 flex-shrink-0" aria-hidden />}
      {suficiente ? (
        <p className="text-[13px] text-fg flex-1 leading-snug">
          Seu recibo de {nomeMesCurto(ym)} saiu.{" "}
          <button type="button" onClick={onAbrir} className="font-semibold text-brand-ink hover:underline">Ver recibo</button>
        </p>
      ) : (
        <p className="text-[13px] text-fg flex-1 leading-snug">{conviteTexto(ym)}</p>
      )}
      <button type="button" onClick={onDispensar} aria-label="Dispensar aviso" className="w-8 h-8 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition flex-shrink-0">
        <X size={16} strokeWidth={ICON_STROKE} aria-hidden />
      </button>
    </div>
  );
}

export function ReciboSheet({ ym, dados, userId, onClose, showToast }) {
  const [estado, setEstado] = useState({ carregando: true });

  useEffect(() => {
    let vivo = true;
    (async () => {
      const boraCriados = await contarBoraNoMes(userId, ym);
      const stats = estatisticasMes({ ...dados, ym, boraCriados });
      if (!stats.suficiente) { if (vivo) setEstado({ stats }); return; }
      const t = tituloDoMes(stats);
      await carregarFonte();
      const canvas = buildReciboImage({ stats, titulo: t.titulo, subtitulo: t.subtitulo });
      if (vivo) setEstado({ stats, canvas, url: canvas.toDataURL("image/png") });
    })();
    return () => { vivo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- gera uma vez ao abrir

  const compartilhar = () => compartilharCanvas(estado.canvas, {
    arquivo: `recibo-${ym}.png`, titulo: `Meu recibo de ${nomeDoMes(ym)}`, showToast, baixadoTexto: "Recibo baixado!",
  });

  return (
    <Sheet title={`Recibo de ${nomeDoMes(ym)}`} onClose={onClose}>
      {estado.carregando ? (
        <div className="h-64 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin" /></div>
      ) : estado.url ? (
        <div className="flex flex-col gap-4">
          <img src={estado.url} alt={`Recibo de ${nomeDoMes(ym)}`} className="w-full max-h-[56dvh] object-contain rounded-md border border-line bg-page" />
          <button type="button" onClick={compartilhar} className={`${btnCls.primary} w-full py-3 text-sm`}>
            <Share2 size={16} strokeWidth={ICON_STROKE} aria-hidden />Compartilhar
          </button>
          <p className="text-[12px] text-fg-3 text-center">Só o que você fez no app. Nenhum valor em R$ aparece no recibo.</p>
        </div>
      ) : (
        <div className="text-center py-4">
          <span className="mx-auto mb-3 w-12 h-12 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><Sparkles size={24} strokeWidth={ICON_STROKE} /></span>
          <p className="text-sm text-fg leading-relaxed">{conviteTexto(ym)}</p>
          <button type="button" onClick={onClose} className={`${btnCls.secondary} w-full py-3 text-sm mt-5`}>Bora</button>
        </div>
      )}
    </Sheet>
  );
}
