import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { drawTaskCard } from "../lib/image.js";

export function TaskShareModal({ task, handle, onClose }) {
  const canvasRef = useRef(null);
  const [format, setFormat] = useState("square");
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    setRendering(true);
    drawTaskCard(canvasRef.current, task, format, handle)
      .then(() => setRendering(false))
      .catch(() => setRendering(false));
  }, [format, task, handle]);

  function download() {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `taskmatch-${(task.title || "card").toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function share() {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { download(); return; }
      const fname = `taskmatch-${(task.title || "card").toLowerCase().replace(/\s+/g, "-").slice(0, 30)}.png`;
      const file = new File([blob], fname, { type: "image/png" });
      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: "Bora decidir isso? 👀", title: `TaskMatch: ${task.title}` });
        } else { download(); }
      } catch (e) { if (e?.name !== "AbortError") download(); }
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-0.5">Compartilhar card</p>
            <h2 className="text-base font-bold text-white truncate max-w-[220px]">{task.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex rounded-xl bg-white/[0.04] p-1 gap-1">
            {[["square", "⬜ Quadrado"], ["story", "📱 Story"]].map(([id, lbl]) => (
              <button key={id} onClick={() => setFormat(id)} className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition ${format === id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"}`}>{lbl}</button>
            ))}
          </div>
          <div className={`w-full relative rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.07] ${format === "story" ? "aspect-[9/16]" : "aspect-square"}`}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ display: rendering ? "none" : "block" }} />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={download} className="flex-1 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 hover:text-white hover:bg-white/[0.08] transition flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Baixar
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={share} className="flex-1 py-3 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Compartilhar
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
