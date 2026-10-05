import { motion } from "framer-motion";
import { X } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";

// Modal padrão do app: sobe de baixo no celular, centralizado no desktop.
// Usar dentro de <AnimatePresence> pra animar a saída.
export function Sheet({ title, kicker, onClose, children, maxWidth = "max-w-sm", z = "z-[90]" }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 ${z} bg-black/40 flex items-end sm:items-center justify-center p-4`}
      onClick={onClose}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`bg-surface rounded-lg w-full ${maxWidth} border border-line shadow max-h-[88dvh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-fg text-base">{title}</h3>
            {kicker && <p className="text-[13px] text-fg-2 mt-0.5 truncate">{kicker}</p>}
          </div>
          {onClose && <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 -mr-1.5 -mt-1 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition"><X size={18} strokeWidth={ICON_STROKE} aria-hidden /></button>}
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}
