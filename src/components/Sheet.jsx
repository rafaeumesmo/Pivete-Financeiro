import { motion } from "framer-motion";

// Modal padrão do app: sobe de baixo no celular, centralizado no desktop.
// Usar dentro de <AnimatePresence> pra animar a saída.
export function Sheet({ title, kicker, onClose, children, maxWidth = "max-w-sm", z = "z-[90]" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 ${z} bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4`}
      onClick={onClose}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`bg-sheet rounded-3xl w-full ${maxWidth} border border-white/10 shadow-2xl max-h-[88dvh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            {kicker && <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-0.5">{kicker}</p>}
            <h3 className="font-bold text-white text-base">{title}</h3>
          </div>
          {onClose && <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition text-sm">✕</button>}
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}
