import { motion } from "framer-motion";
import { compressImage } from "../lib/image.js";

// Compartilhado entre mobile e desktop — só o wrapper/estilo do card muda
// (isDesktop); os campos e a lógica de submit são exatamente os mesmos, então
// vivem num único lugar em vez de duas árvores JSX mantidas manualmente em
// sincronia.
export function CreateTaskForm({ isDesktop, newTaskData, setNewTaskData, imageInputRef, onCancel, onSubmit, canShareToFeed, onShareToFeed, showToast }) {
  async function pickImage(file, successMessage) {
    if (!file?.type.startsWith("image/")) return;
    try {
      const url = await compressImage(file);
      if (url.length > 1_000_000) { showToast("Imagem muito grande.", "bg-red-600/90"); return; }
      setNewTaskData((p) => ({ ...p, image: url }));
      if (successMessage) showToast(successMessage, "bg-emerald-600/90");
    } catch { showToast("Imagem inválida.", "bg-red-600/90"); }
  }

  return (
    <motion.div className={isDesktop ? "h-full overflow-y-auto px-10 py-10" : "h-full overflow-y-auto px-5 pt-4 pb-6"} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className={isDesktop ? "max-w-xl mx-auto" : undefined}>
        <div className={`flex items-center justify-between ${isDesktop ? "mb-6" : "mb-5"}`}>
          <div><p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Nova tarefa</p><h2 className={`font-bold text-white ${isDesktop ? "text-xl" : "text-lg"}`}>Criar card</h2></div>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar</button>
        </div>
        <form
          onSubmit={onSubmit}
          onPaste={(e) => {
            const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith("image/"));
            if (!file) return;
            e.preventDefault();
            pickImage(file, "Imagem colada!");
          }}
          className={isDesktop ? "rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col gap-5" : "flex flex-col gap-4"}
        >
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Imagem <span className="normal-case text-white/20 font-normal tracking-normal">(opcional)</span></label>
            {newTaskData.image ? (
              <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08]" style={{ aspectRatio: "16/9" }}>
                <img src={newTaskData.image} className="w-full h-full object-cover" alt="" />
                <button type="button" onClick={() => setNewTaskData(p => ({ ...p, image: null }))} aria-label="Remover imagem" className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/85 transition text-sm">✕</button>
              </div>
            ) : (
              <div className="w-full rounded-2xl border-2 border-dashed border-white/[0.11] bg-white/[0.02] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/25 hover:bg-white/[0.04] transition py-8" onClick={() => imageInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickImage(e.dataTransfer.files[0]); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-9 h-9 text-white/20"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                <p className="text-[13px] text-white/30 font-medium">Clique, cole ou arraste</p>
                <p className="text-[11px] text-white/20">No celular, abre a câmera 📷</p>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; pickImage(file); e.target.value = ""; }} />
          </div>
          <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Título</label><input value={newTaskData.title} onChange={(e) => setNewTaskData((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition" placeholder="Ex: Comprar mantimentos" /></div>
          <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Descrição {newTaskData.isChecklist && <span className="normal-case text-white/20 font-normal tracking-normal">(opcional com checklist)</span>}</label><textarea value={newTaskData.description} onChange={(e) => setNewTaskData((p) => ({ ...p, description: e.target.value }))} className="w-full min-h-[80px] rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 resize-none transition" placeholder="Detalhes da tarefa..." /></div>
          <div>
            <button type="button" onClick={() => setNewTaskData(p => ({ ...p, isChecklist: !p.isChecklist, items: p.isChecklist ? [] : [{ id: Date.now(), text: "", emoji: null, done: false, order: 0 }] }))} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${newTaskData.isChecklist ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/60"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {newTaskData.isChecklist ? "Com itens ✓" : "+ Itens / checklist"}
            </button>
            {newTaskData.isChecklist && (
              <div className="mt-3 flex flex-col gap-2">
                {newTaskData.items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    </div>
                    <input
                      id={`itm-${item.id}`}
                      value={item.text}
                      onChange={e => setNewTaskData(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, text: e.target.value } : it) }))}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const newId = Date.now();
                          setNewTaskData(p => { const arr = [...p.items]; arr.splice(idx + 1, 0, { id: newId, text: "", emoji: null, done: false, order: idx + 1 }); return { ...p, items: arr }; });
                          setTimeout(() => document.getElementById(`itm-${newId}`)?.focus(), 30);
                        } else if (e.key === "Backspace" && !item.text && newTaskData.items.length > 1) {
                          e.preventDefault();
                          const focusId = idx > 0 ? newTaskData.items[idx - 1].id : newTaskData.items[1]?.id;
                          setNewTaskData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
                          setTimeout(() => document.getElementById(`itm-${focusId}`)?.focus(), 30);
                        }
                      }}
                      placeholder={`Item ${idx + 1}…`}
                      autoFocus={idx > 0 && idx === newTaskData.items.length - 1 && !item.text}
                      className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#2563eb]/50 transition"
                    />
                    {newTaskData.items.length > 1 && (
                      <button type="button" onClick={() => setNewTaskData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 transition">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => { const newId = Date.now(); setNewTaskData(p => ({ ...p, items: [...p.items, { id: newId, text: "", emoji: null, done: false, order: p.items.length }] })); setTimeout(() => document.getElementById(`itm-${newId}`)?.focus(), 30); }} className="flex items-center gap-2 text-[13px] text-[#3b82f6]/60 hover:text-[#3b82f6] transition py-0.5 px-1 mt-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Adicionar item
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Categoria</label><select value={newTaskData.category} onChange={(e) => setNewTaskData((p) => ({ ...p, category: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60">{["Alimentação","Lazer","Saúde","Estudos","Trabalho","Outros"].map((c) => (<option key={c} value={c} className="bg-[#111114]">{c}</option>))}</select></div>
            <div><label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Emoji</label><input value={newTaskData.emoji} onChange={(e) => setNewTaskData((p) => ({ ...p, emoji: e.target.value }))} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition" placeholder="✨" /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Prioridade</label>
            <div className="flex gap-2">{[{ value: "high", label: "🔴 Alta" }, { value: "medium", label: "🟡 Média" }, { value: "low", label: "🟢 Baixa" }].map(({ value, label }) => (<button key={value} type="button" onClick={() => setNewTaskData((p) => ({ ...p, priority: p.priority === value ? null : value }))} className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition border ${newTaskData.priority === value ? "bg-white/[0.12] border-white/25 text-white" : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/60 hover:border-white/15"}`}>{label}</button>))}</div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Prazo <span className="normal-case text-white/20 font-normal tracking-normal">(opcional)</span></label>
            <input type="date" value={newTaskData.deadline} onChange={(e) => setNewTaskData((p) => ({ ...p, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 transition [color-scheme:dark]" />
          </div>
          <div className="flex gap-3 pt-1"><button type="button" onClick={onCancel} className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm text-white/50 hover:bg-white/[0.07] hover:text-white/70 transition">Cancelar</button><button type="submit" className="flex-1 rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition">Adicionar tarefa</button></div>
          {canShareToFeed && (
            <button type="button" onClick={onShareToFeed} className="w-full py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-medium hover:bg-emerald-500/25 transition">🌐 Compartilhar no feed</button>
          )}
        </form>
      </div>
    </motion.div>
  );
}
