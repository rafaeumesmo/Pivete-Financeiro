import { motion } from "framer-motion";
import { AlarmClock, Zap, Sunrise } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";

export function SnoozeSetupModal({ onChoose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm bg-surface rounded-lg border border-line shadow overflow-hidden"
      >
        <div className="px-6 pt-6 pb-6">
          <div className="flex flex-col items-center text-center mb-6">
            <span className="w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center mb-4" aria-hidden><AlarmClock size={24} strokeWidth={ICON_STROKE} /></span>
            <h2 className="text-base font-semibold text-fg mb-1.5">Quando contas adiadas devem voltar pro deck?</h2>
            <p className="text-[12px] text-fg-3 leading-relaxed">Você pode mudar essa preferência depois no Perfil.</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onChoose("1h")}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-md bg-surface border border-line hover:bg-tile transition"
            >
              <Zap size={20} strokeWidth={ICON_STROKE} className="text-fg-2" aria-hidden />
              <span className="text-sm font-semibold text-fg">Em 1 hora</span>
              <span className="text-[12px] text-fg-3">Volta logo</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onChoose("1d")}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-md bg-brand/[0.06] border border-brand transition"
            >
              <Sunrise size={20} strokeWidth={ICON_STROKE} className="text-brand-ink" aria-hidden />
              <span className="text-sm font-semibold text-fg">No dia seguinte</span>
              <span className="text-[12px] text-brand-ink">Recomendado</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
