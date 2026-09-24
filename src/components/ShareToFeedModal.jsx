import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ShareToFeedModal({ task, onShare, onClose }) {
  const [audience, setAudience] = useState("friends");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      await onShare(task, audience);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-0.5">Compartilhar no</p>
            <h2 className="text-base font-bold text-white">Feed Social</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Task preview */}
          <div className={`rounded-2xl bg-gradient-to-br ${task.gradient} p-4 flex items-center gap-3`}>
            <div className="text-3xl">{task.emoji}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{task.title}</p>
              <p className="text-[11px] text-white/50 mt-0.5 truncate">{task.category}</p>
            </div>
          </div>

          {/* Audience selector */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-3">Quem pode ver</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "friends", label: "Todos os amigos", icon: "👥", desc: "Qualquer amigo aceito" },
                { value: "close",   label: "Close Friends",   icon: "⭐", desc: "Só seus close friends", green: true },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border transition text-left ${
                    audience === opt.value
                      ? opt.green
                        ? "bg-emerald-500/15 border-emerald-500/40"
                        : "bg-[#2563eb]/15 border-[#2563eb]/40"
                      : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <p className={`text-[13px] font-semibold ${
                    audience === opt.value ? (opt.green ? "text-emerald-300" : "text-[#93c5fd]") : "text-white/60"
                  }`}>{opt.label}</p>
                  <p className="text-[11px] text-white/30">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {audience === "close" && (
            <p className="text-[11px] text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 leading-relaxed">
              ⭐ Apenas amigos que você marcou como close friend verão esta task.
            </p>
          )}

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-center text-emerald-400 font-semibold text-sm"
              >
                ✓ Compartilhado no feed!
              </motion.div>
            ) : (
              <motion.button
                key="btn"
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading
                  ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : "Publicar no feed"
                }
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
