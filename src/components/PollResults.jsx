import { useRef } from "react";
import { motion } from "framer-motion";
import { APP_NAME } from "../config.js";
import { formatBRL } from "../lib/money.js";
import { Trophy, Share2 } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { btnCls } from "./ui.jsx";

const ACCENT = "#1F3FD6"; // cor de marca
const WIN = "#16A34A";

function pct(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

// Desenha o card de resultado num canvas e compartilha/baixa como PNG.
function buildResultImage(poll, tally, totalVoters) {
  const W = 1080, pad = 72;
  const rowH = 132, headH = 300;
  const H = headH + tally.length * rowH + 140;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const FONT = '"Plus Jakarta Sans Variable", system-ui, sans-serif';
  ctx.fillStyle = "#F4F5F7"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, headH);
  ctx.fillStyle = "#E6E8EC"; ctx.fillRect(0, headH - 2, W, 2);

  ctx.fillStyle = "#6B7280";
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText(`Bora?  ·  feito no ${APP_NAME}`, pad, 90);

  ctx.fillStyle = "#111318";
  ctx.font = `700 60px ${FONT}`;
  wrapText(ctx, poll.title, pad, 170, W - pad * 2, 66);

  ctx.fillStyle = "#6B7280";
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(`${totalVoters} participante${totalVoters !== 1 ? "s" : ""}`, pad, headH - 36);

  const max = Math.max(1, ...tally.map((t) => t.count));
  tally.forEach((t, i) => {
    const y = headH + i * rowH + 20;
    const isWin = t.count === max && t.count > 0;
    ctx.fillStyle = "#111318";
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText(`${t.emoji ? t.emoji + " " : ""}${t.label}`, pad, y + 8);
    ctx.textAlign = "right";
    ctx.fillStyle = isWin ? WIN : "#6B7280";
    ctx.fillText(`${t.count}  ·  ${pct(t.count, totalVoters)}%`, W - pad, y + 8);
    ctx.textAlign = "left";
    // barra
    const bw = W - pad * 2;
    ctx.fillStyle = "#E6E8EC";
    roundRect(ctx, pad, y + 30, bw, 20, 6); ctx.fill();
    ctx.fillStyle = isWin ? WIN : ACCENT;
    roundRect(ctx, pad, y + 30, Math.max(10, bw * (t.count / max)), 20, 6); ctx.fill();
  });

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}

export function PollResults({ poll, tally, totalVoters, isCreator, onClosePoll, showToast }) {
  const busy = useRef(false);

  const sorted = [...tally].sort((a, b) => b.count - a.count);
  const max = Math.max(0, ...tally.map((t) => t.count));
  const winners = max > 0 ? sorted.filter((t) => t.count === max) : [];
  const closed = poll.status === "closed";

  async function shareImage() {
    if (busy.current) return;
    busy.current = true;
    try {
      const canvas = buildResultImage(poll, sorted, totalVoters);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const file = new File([blob], "bora-resultado.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: poll.title });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "bora-resultado.png"; a.click();
        URL.revokeObjectURL(url);
        showToast?.("Imagem do resultado baixada!", "bg-emerald-600/90");
      }
    } catch { showToast?.("Não foi possível gerar a imagem.", "bg-red-600/90"); }
    finally { busy.current = false; }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Vencedor */}
      {winners.length === 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg px-4 py-3 flex items-center gap-3 bg-surface border border-line"
        >
          <span className="w-10 h-10 rounded-md bg-tile text-pos flex items-center justify-center text-xl flex-shrink-0" aria-hidden>{winners[0].emoji || <Trophy size={20} strokeWidth={ICON_STROKE} />}</span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-pos">{closed ? "Resultado final" : "Na frente"}</p>
            <p className="text-sm font-semibold text-fg truncate">
              {winners[0].label} {winners.length === 1 && `venceu com ${pct(winners[0].count, totalVoters)}%`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Barras */}
      <div className="flex flex-col gap-3">
        {sorted.map((t) => {
          const p = pct(t.count, totalVoters);
          const isWin = t.count === max && t.count > 0;
          return (
            <div key={t.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-fg font-medium truncate">{t.emoji ? `${t.emoji} ` : ""}{t.label}{t.budget_cents > 0 && <span className="text-fg-2 font-normal"> · {formatBRL(t.budget_cents)} por pessoa</span>}</span>
                <span className={`text-[12px] font-semibold flex-shrink-0 ml-2 ${isWin ? "text-pos" : "text-fg-2"}`}>{t.count} · {p}%</span>
              </div>
              <div className="h-2 rounded-sm bg-tile overflow-hidden">
                <motion.div
                  className="h-full rounded-sm"
                  style={{ background: isWin ? "rgb(var(--pos))" : "rgb(var(--brand))" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${max ? (t.count / max) * 100 : 0}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
              {/* Apelidos */}
              {t.voters.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex">
                    {t.voters.slice(0, 6).map((nick, i) => (
                      <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium text-fg bg-tile border border-surface"
                        style={{ marginLeft: i > 0 ? "-5px" : 0, zIndex: 10 - i }}>
                        {nick?.[0]?.toUpperCase() || "?"}
                      </div>
                    ))}
                  </div>
                  <span className="text-[12px] text-fg-3 truncate">{t.voters.slice(0, 3).join(", ")}{t.voters.length > 3 ? ` +${t.voters.length - 3}` : ""}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[12px] text-fg-3 text-center">
        {totalVoters} participante{totalVoters !== 1 ? "s" : ""}
        {!closed && <span className="text-pos"> · ao vivo</span>}
      </p>

      {/* Ações do criador */}
      {isCreator && (
        <div className="flex gap-2">
          {!closed && (
            <button onClick={onClosePoll} className={`${btnCls.secondary} flex-1 py-2.5 text-sm`}>
              Encerrar enquete
            </button>
          )}
          <button onClick={shareImage} className={`${btnCls.secondary} flex-1 py-2.5 text-sm`}>
            <Share2 size={16} strokeWidth={ICON_STROKE} aria-hidden />Compartilhar resultado
          </button>
        </div>
      )}
    </div>
  );
}
