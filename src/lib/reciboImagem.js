import { FONTE, roundRect, wrapText } from "./canvasImagem.js";
import { GATO } from "../components/Brand.jsx";
import { nomeDoMes } from "./recibo.js";

// Recibo do mês em formato story (1080×1920), visual do app: fundo claro,
// azul de marca, Plus Jakarta Sans. Só comportamento — nenhum valor em R$.
// `stats` vem de estatisticasMes (lib/recibo.js); titulo/subtitulo, do título
// do mês. Chame carregarFonte() antes, senão o PNG sai na fonte do sistema.

const W = 1080, H = 1920, PAD = 72;
const COR = { page: "#F4F5F7", surface: "#FFFFFF", line: "#E6E8EC", fg: "#111318", fg2: "#6B7280", fg3: "#9CA3AF", brand: "#1F3FD6", onBrand: "#FFFFFF" };

function gato(ctx, x, y, tam, cor) {
  const k = tam / 24;
  ctx.save();
  ctx.translate(x, y); ctx.scale(k, k);
  ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.lineWidth = 1.8; ctx.stroke(new Path2D(GATO.corpo));
  for (const [cx, cy] of GATO.olhos) { ctx.beginPath(); ctx.ellipse(cx, cy, 1, 1.3, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.lineWidth = 1; ctx.fill(new Path2D(GATO.nariz)); ctx.stroke(new Path2D(GATO.nariz));
  ctx.lineWidth = 1.2; ctx.stroke(new Path2D(GATO.bigodes));
  ctx.restore();
}

function tile(ctx, x, y, w, h, { valor, rotulo, valorTam = 88 }) {
  ctx.fillStyle = COR.surface; roundRect(ctx, x, y, w, h, 28); ctx.fill();
  ctx.strokeStyle = COR.line; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 28); ctx.stroke();
  ctx.fillStyle = COR.fg; ctx.font = `800 ${valorTam}px ${FONTE}`;
  ctx.fillText(valor, x + 40, y + 40 + valorTam * 0.82);
  ctx.fillStyle = COR.fg2; ctx.font = `500 32px ${FONTE}`;
  ctx.fillText(rotulo, x + 40, y + h - 40);
}

export function buildReciboImage({ stats, titulo, subtitulo, exemplo = false }) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COR.page; ctx.fillRect(0, 0, W, H);

  // Marca + mês
  gato(ctx, PAD, 96, 64, COR.brand);
  ctx.font = `700 44px ${FONTE}`;
  ctx.fillStyle = COR.fg; ctx.fillText("Pivete", PAD + 84, 144);
  const larg = ctx.measureText("Pivete ").width;
  ctx.fillStyle = COR.brand; ctx.fillText("Financeiro", PAD + 84 + larg, 144);
  ctx.fillStyle = COR.fg2; ctx.font = `600 36px ${FONTE}`;
  ctx.fillText(exemplo ? "Recibo de exemplo" : `Recibo de ${nomeDoMes(stats.ym)}`, PAD, 252);
  if (exemplo) {
    // Selo no canto: quem vir o PNG compartilhado sabe que não é de ninguém.
    ctx.font = `700 30px ${FONTE}`;
    const txt = "EXEMPLO", w = ctx.measureText(txt).width + 48;
    ctx.fillStyle = COR.surface; roundRect(ctx, W - PAD - w, 92, w, 64, 20); ctx.fill();
    ctx.strokeStyle = COR.brand; ctx.lineWidth = 3; roundRect(ctx, W - PAD - w, 92, w, 64, 20); ctx.stroke();
    ctx.fillStyle = COR.brand; ctx.fillText(txt, W - PAD - w + 24, 136);
  }

  // Título do mês no card azul (o mesmo do deck)
  const cardY = 300, cardH = 460;
  ctx.fillStyle = COR.brand; roundRect(ctx, PAD, cardY, W - PAD * 2, cardH, 40); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = `600 32px ${FONTE}`;
  ctx.fillText("Seu título do mês", PAD + 56, cardY + 92);
  ctx.fillStyle = COR.onBrand; ctx.font = `800 92px ${FONTE}`;
  const fimTitulo = wrapText(ctx, titulo, PAD + 56, cardY + 210, W - PAD * 2 - 112, 100);
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = `500 38px ${FONTE}`;
  wrapText(ctx, subtitulo, PAD + 56, fimTitulo + 84, W - PAD * 2 - 112, 50);

  // Números do mês (2 × 3)
  const gx = PAD, gy = 812, gap = 24, tw = (W - PAD * 2 - gap) / 2, th = 210;
  const pos = (i) => [gx + (i % 2) * (tw + gap), gy + Math.floor(i / 2) * (th + gap)];
  const tiles = [
    { valor: String(stats.decididas), rotulo: stats.decididas === 1 ? "conta decidida" : "contas decididas" },
    { valor: stats.pctSemAdiar == null ? "—" : `${stats.pctSemAdiar}%`, rotulo: "pagas sem adiar" },
    { valor: String(stats.adiadas), rotulo: stats.adiadas === 1 ? "adiada" : "adiadas" },
    { valor: String(stats.cortes), rotulo: stats.cortes === 1 ? "gasto cortado" : "gastos cortados" },
    { valor: String(stats.maiorSequencia), rotulo: stats.maiorSequencia === 1 ? "dia seguido no app" : "dias seguidos no app" },
    { valor: stats.categoriaTop || "—", rotulo: "mais apareceu", valorTam: 52 },
  ];
  tiles.forEach((t, i) => { const [x, y] = pos(i); tile(ctx, x, y, tw, th, t); });

  // Conquistas do mês
  const cy = gy + 3 * th + 2 * gap + 84;
  ctx.fillStyle = COR.fg2; ctx.font = `600 32px ${FONTE}`;
  ctx.fillText("Conquistas do mês", PAD, cy);
  ctx.font = `600 34px ${FONTE}`;
  if (!stats.conquistas.length) {
    ctx.fillStyle = COR.fg3; ctx.fillText("Nenhuma desta vez. O mês que vem tá aí.", PAD, cy + 64);
  } else {
    // No máximo 2 linhas de chips; o que não couber vira "+N".
    let x = PAD, y = cy + 30, linha = 1;
    const lista = stats.conquistas;
    for (let i = 0; i < lista.length; i++) {
      const nome = lista[i];
      const w = ctx.measureText(nome).width + 56;
      if (x + w > W - PAD) {
        if (linha === 2) { ctx.fillStyle = COR.fg2; ctx.fillText(`+${lista.length - i}`, x + 8, y + 46); break; }
        x = PAD; y += 84; linha++;
      }
      ctx.fillStyle = COR.surface; roundRect(ctx, x, y, w, 68, 20); ctx.fill();
      ctx.strokeStyle = COR.line; ctx.lineWidth = 2; roundRect(ctx, x, y, w, 68, 20); ctx.stroke();
      ctx.fillStyle = COR.fg; ctx.fillText(nome, x + 28, y + 46);
      x += w + 16;
    }
  }

  // Rodapé
  ctx.textAlign = "center"; ctx.fillStyle = COR.fg3; ctx.font = `500 30px ${FONTE}`;
  ctx.fillText("pivetefinanceiro.com", W / 2, H - 72);
  ctx.textAlign = "left";
  return canvas;
}
