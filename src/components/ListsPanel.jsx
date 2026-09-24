import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Card expansível de uma lista (compras, checklist com etapas, etc.) — permite
// marcar/adicionar itens sem precisar esperar a vez dela no deck de swipe.
function ListCard({ task, onToggleItem, onAddItem, onCompleteChecklist }) {
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const items = task.items || [];
  const doneCount = items.filter((i) => i.done).length;
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
  }

  return (
    <div className={`rounded-2xl border overflow-hidden transition ${allDone ? "border-emerald-500/25 bg-emerald-500/[0.04]" : "border-white/[0.08] bg-white/[0.03]"}`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${task.gradient}`}>{task.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-white/90 font-semibold truncate leading-snug">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden max-w-[110px]">
              <div className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-400" : "bg-[#2563eb]"}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[10px] flex-shrink-0 ${allDone ? "text-emerald-400 font-semibold" : "text-white/30"}`}>
              {total === 0 ? "sem itens" : allDone ? "Tudo pronto ✓" : `${doneCount}/${total}`}
            </span>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3.5 pb-3.5 pt-3 border-t border-white/[0.06] flex flex-col gap-1.5">
              {sorted.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onToggleItem(task.id, item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition ${item.done ? "bg-white/[0.02]" : "bg-white/[0.05] hover:bg-white/[0.08]"}`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.done ? "bg-emerald-500 border-emerald-500" : "border-white/25"}`}>
                    {item.done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className={`flex-1 text-[13px] ${item.done ? "line-through text-white/25" : "text-white/80"}`}>{item.text}</span>
                </button>
              ))}
              {items.length === 0 && <p className="text-[11px] text-white/20 text-center py-2">Nenhum item ainda.</p>}

              <form onSubmit={handleAdd} className="flex items-center gap-2 mt-1">
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Adicionar item..."
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
                />
                <button type="submit" disabled={!newText.trim()} aria-label="Adicionar item" className="w-8 h-8 rounded-xl bg-[#2563eb] flex-shrink-0 flex items-center justify-center disabled:opacity-30 transition hover:bg-blue-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </form>

              {allDone && onCompleteChecklist && (
                <button
                  onClick={() => onCompleteChecklist(task.id)}
                  className="mt-1 w-full py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[12px] font-semibold hover:bg-emerald-500/25 transition"
                >
                  ✓ Concluir lista
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickCreate({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] py-3.5 text-center text-[13px] font-medium text-[#93c5fd] hover:border-[#2563eb]/40 hover:bg-[#2563eb]/[0.04] transition flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Nova lista
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 rounded-2xl border border-[#2563eb]/30 bg-[#2563eb]/[0.06] p-1.5">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex: Lista de compras"
        className="flex-1 bg-transparent px-2.5 py-2 text-sm text-white placeholder:text-white/30 outline-none"
      />
      <button type="button" onClick={() => { setOpen(false); setTitle(""); }} className="px-3 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/60 transition flex-shrink-0">Cancelar</button>
      <button type="submit" disabled={!title.trim()} className="px-3.5 py-2 rounded-xl bg-[#2563eb] text-white text-[12px] font-semibold disabled:opacity-40 flex-shrink-0">Criar</button>
    </form>
  );
}

export function ListsPanel({ tasks = [], onToggleItem, onAddItem, onCompleteChecklist, onCreateChecklist }) {
  const lists = tasks.filter((t) => Array.isArray(t.items));

  return (
    <div className="px-5 pt-4">
      <h3 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-3 pl-1">Suas listas</h3>

      {onCreateChecklist && <div className="mb-3"><QuickCreate onCreate={onCreateChecklist} /></div>}

      {lists.length === 0 ? (
        <p className="text-[12px] text-white/20 py-8 text-center leading-relaxed">
          Nenhuma lista ainda.<br />Crie uma pra compras, tarefas com várias etapas, etc.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {lists.map((t) => (
            <ListCard key={t.id} task={t} onToggleItem={onToggleItem} onAddItem={onAddItem} onCompleteChecklist={onCompleteChecklist} />
          ))}
        </div>
      )}
    </div>
  );
}
