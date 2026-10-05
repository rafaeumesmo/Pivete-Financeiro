// Utilitários das imagens geradas em canvas (resultado do Bora?, recibo do
// mês): fonte da marca, formas, quebra de linha e compartilhar/baixar PNG.

export const FONTE = '"Plus Jakarta Sans Variable", system-ui, sans-serif';

// O canvas não espera a webfont: sem isso o primeiro PNG sai em system-ui.
export async function carregarFonte(pesos = [500, 600, 700, 800]) {
  try { await Promise.all(pesos.map((p) => document.fonts.load(`${p} 40px ${FONTE}`))); } catch { /* usa o fallback */ }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Escreve quebrando por palavra; devolve o y da última linha.
export function wrapText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
  return yy;
}

// Compartilha o PNG (share sheet do celular) ou baixa o arquivo.
export async function compartilharCanvas(canvas, { arquivo, titulo, showToast, baixadoTexto = "Imagem baixada!" }) {
  try {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const file = new File([blob], arquivo, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: titulo });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = arquivo; a.click();
      URL.revokeObjectURL(url);
      showToast?.(baixadoTexto, "bg-emerald-600/90");
    }
  } catch (e) {
    if (e?.name !== "AbortError") showToast?.("Não foi possível gerar a imagem.", "bg-red-600/90");
  }
}
