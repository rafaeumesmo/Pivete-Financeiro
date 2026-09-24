// ── Canvas / share-card helpers ─────────────────────────────────
const TW_COLORS = {
  "slate-400":"#94a3b8","slate-500":"#64748b","slate-600":"#475569","slate-700":"#334155",
  "gray-500":"#6b7280","gray-600":"#4b5563","gray-700":"#374151",
  "zinc-600":"#52525b","zinc-700":"#3f3f46",
  "red-500":"#ef4444","red-600":"#dc2626","red-700":"#b91c1c",
  "orange-500":"#f97316","orange-600":"#ea580c","orange-700":"#c2410c",
  "amber-500":"#f59e0b","amber-600":"#d97706","amber-700":"#b45309",
  "yellow-500":"#eab308","yellow-600":"#ca8a04",
  "rose-500":"#f43f5e","rose-600":"#e11d48","rose-700":"#be123c",
  "pink-500":"#ec4899","pink-600":"#db2777","pink-700":"#be185d",
  "emerald-500":"#10b981","emerald-600":"#059669","emerald-700":"#047857",
  "teal-500":"#14b8a6","teal-600":"#0d9488","teal-700":"#0f766e",
  "cyan-500":"#06b6d4","cyan-600":"#0891b2","cyan-700":"#0e7490",
  "sky-500":"#0ea5e9","sky-600":"#0284c7","sky-700":"#0369a1",
  "blue-500":"#3b82f6","blue-600":"#2563eb","blue-700":"#1d4ed8",
  "indigo-600":"#4f46e5","indigo-700":"#4338ca","indigo-800":"#3730a3",
  "violet-600":"#7c3aed","violet-700":"#6d28d9",
  "purple-500":"#a855f7","purple-600":"#9333ea","purple-700":"#7e22ce",
  "fuchsia-600":"#c026d3","fuchsia-700":"#a21caf",
  "lime-600":"#65a30d","lime-700":"#4d7c0f",
  "green-500":"#22c55e","green-600":"#16a34a","green-700":"#15803d",
};
function parseTailwindGradient(str) {
  const from = (str.match(/from-([^\s]+)/) || [])[1];
  const via  = (str.match(/via-([^\s]+)/)  || [])[1];
  const to   = (str.match(/to-([^\s]+)/)   || [])[1];
  const c0 = TW_COLORS[from] || "#2563eb";
  const c2 = TW_COLORS[to]   || "#1e3a8a";
  const c1 = TW_COLORS[via];
  return c1 ? [c0, c1, c2] : [c0, c2];
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function wrapText(ctx, text, x, y, maxWidth, lineH, maxLines = 8) {
  const words = text.split(" ");
  let line = "", lines = [];
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim()); line = word + " ";
      if (lines.length >= maxLines - 1) break;
    } else { line = test; }
  }
  if (line.trim()) lines.push(line.trim());
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return lines.length;
}

// Desenha o card compartilhável (usado por TaskShareModal) num <canvas> off-DOM.
export async function drawTaskCard(canvas, task, format = "square", handle = "") {
  const isStory = format === "story";
  const W = 1080, H = isStory ? 1920 : 1080;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 80);
  ctx.clip();
  const stops = parseTailwindGradient(task.gradient || "");
  const bg = ctx.createLinearGradient(0, 0, W * 0.7, H);
  bg.addColorStop(0, stops[0]);
  if (stops[2]) { bg.addColorStop(0.5, stops[1]); bg.addColorStop(1, stops[2]); }
  else { bg.addColorStop(1, stops[1] || stops[0]); }
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const scrim = ctx.createLinearGradient(0, H * 0.3, 0, H);
  scrim.addColorStop(0, "rgba(0,0,0,0)"); scrim.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = scrim; ctx.fillRect(0, H * 0.3, W, H * 0.7);
  ctx.restore();
  const pad = 80;
  const cat = (task.category || "").toUpperCase();
  ctx.font = "600 30px system-ui,-apple-system,sans-serif";
  ctx.textAlign = "left";
  const bw = Math.min(ctx.measureText(cat).width + 56, W - pad * 2);
  ctx.save();
  roundRectPath(ctx, pad, pad, bw, 58, 29);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillText(cat, pad + 28, pad + 38);
  const emojiSz = isStory ? 180 : 160;
  ctx.font = `${emojiSz}px serif`;
  ctx.textAlign = "center";
  ctx.fillText(task.emoji || "✨", W / 2, isStory ? H * 0.31 : H * 0.36);
  const titleSz = isStory ? 92 : 80;
  ctx.font = `800 ${titleSz}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 18;
  const titleY = isStory ? H * 0.49 : H * 0.55;
  const nLines = wrapText(ctx, task.title || "", W / 2, titleY, W - pad * 2.4, titleSz * 1.22, 3);
  ctx.shadowBlur = 0;
  if (task.description) {
    const descSz = isStory ? 50 : 44;
    ctx.font = `400 ${descSz}px system-ui,-apple-system,sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 6;
    wrapText(ctx, task.description, W / 2, titleY + nLines * titleSz * 1.22 + (isStory ? 60 : 50), W - pad * 3.2, descSz * 1.42, 4);
    ctx.shadowBlur = 0;
  }
  ctx.font = `500 ${isStory ? 42 : 36}px system-ui,-apple-system,sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.textAlign = "center";
  ctx.fillText(handle ? `TaskMatch  ·  ${handle}` : "TaskMatch", W / 2, H - (isStory ? 90 : 70));
}

// Redimensiona/comprime uma imagem no client antes de guardar em base64 no
// localStorage — sem isso, poucas fotos de tarefa já se aproximam da cota
// típica de 5-10MB do navegador (ver TaskMatch.jsx's save()).
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
