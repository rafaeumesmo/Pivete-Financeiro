import { motion } from "framer-motion";

export function ListCompleteModal({ task, onCompleteAnyway, onCreatePending, onSnooze }) {
  const items = task?.items || [];
  const pending = items.filter(i => !i.done);
  const doneCount = items.length - pending.length;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-6">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl mb-3">{task.emoji}</div>
            <h2 className="text-[15px] font-bold text-white mb-1">{pending.length} {pending.length === 1 ? "item" : "itens"} pendentes</h2>
            <p className="text-[12px] text-white/35">{doneCount > 0 ? `${doneCount} de ${items.length} marcados` : "Nenhum item marcado"}</p>
          </div>
          {pending.length > 0 && (
            <div className="bg-white/[0.04] rounded-2xl px-4 py-3 mb-4 border border-white/[0.05]">
              {pending.slice(0, 3).map(item => (
                <p key={item.id} className="text-[12px] text-white/45 py-0.5 truncate">{item.emoji ? `${item.emoji} ` : "· "}{item.text}</p>
              ))}
              {pending.length > 3 && <p className="text-[11px] text-white/25 pt-1">+{pending.length - 3} mais</p>}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onCreatePending} className="w-full py-3.5 rounded-2xl bg-[#2563eb]/15 border border-[#2563eb]/30 text-sm font-semibold text-[#93c5fd] hover:bg-[#2563eb]/25 transition">
              📋 Criar lista com o que faltou
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onCompleteAnyway} className="w-full py-3.5 rounded-2xl bg-white/[0.05] border border-white/[0.09] text-sm font-medium text-white/65 hover:bg-white/[0.09] transition">
              ✓ Concluir mesmo assim
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onSnooze} className="w-full py-2.5 text-[13px] text-white/30 hover:text-white/50 transition">
              ⏰ Adiar — volto depois
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
