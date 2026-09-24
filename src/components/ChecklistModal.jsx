import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ChecklistModal({ task, onClose, onToggleItem, onAddItem }) {
  const [newText, setNewText] = useState("");
  const addRef = useRef(null);
  const items = task?.items || [];
  const doneCount = items.filter(i => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  const sorted = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  function handleAdd(e) {
    e?.preventDefault();
    const t = newText.trim();
    if (!t) return;
    onAddItem(task.id, t);
    setNewText("");
    addRef.current?.focus();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="fixed inset-0 z-[85] flex flex-col bg-[#0e0e11]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)", paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Gradient header */}
      <div className={`relative flex-shrink-0 bg-gradient-to-br ${task.gradient} overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-[#0e0e11]" />
        <div className="relative px-5 pt-5 pb-7">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} className="w-9 h-9 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/70 hover:text-white transition">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-white/55 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">{task.category}</span>
          </div>
          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl mt-0.5 flex-shrink-0">{task.emoji}</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-bold text-white leading-tight">{task.title}</h2>
              <p className={`text-[13px] mt-0.5 ${allDone ? "text-emerald-300" : "text-white/50"}`}>
                {allDone ? "✓ Tudo marcado!" : `${doneCount} de ${total} ${total === 1 ? "item" : "itens"}`}
              </p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
            <motion.div className="h-full rounded-full bg-white/65" animate={{ width: `${pct}%` }} transition={{ duration: 0.35 }} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence initial={false}>
          {sorted.map(item => (
            <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <button
                onClick={() => onToggleItem(task.id, item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl mb-2 text-left transition active:scale-[0.98] ${
                  item.done ? "bg-white/[0.025] border border-white/[0.04]" : "bg-white/[0.07] border border-white/[0.09] hover:bg-white/[0.10]"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.done ? "bg-emerald-500 border-emerald-500" : "border-white/30"}`}>
                  {item.done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                {item.emoji && <span className="text-lg flex-shrink-0">{item.emoji}</span>}
                <span className={`flex-1 text-sm font-medium transition-all ${item.done ? "line-through text-white/25" : "text-white/85"}`}>{item.text}</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-white/30 text-sm">Nenhum item ainda. Adicione abaixo.</p>
          </div>
        )}
      </div>

      {/* Add item */}
      <div className="flex-shrink-0 px-4 pt-3 border-t border-white/[0.06]">
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            ref={addRef}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder="Adicionar item..."
            className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
          />
          <motion.button type="submit" whileTap={{ scale: 0.9 }} disabled={!newText.trim()} aria-label="Adicionar item" className="w-12 h-12 rounded-2xl bg-[#2563eb] flex-shrink-0 flex items-center justify-center disabled:opacity-30 transition hover:bg-blue-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
