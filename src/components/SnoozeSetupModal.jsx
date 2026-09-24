import { motion } from "framer-motion";

export function SnoozeSetupModal({ onChoose }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl mb-4">⏰</div>
            <h2 className="text-base font-bold text-white mb-1.5">Quando contas adiadas devem voltar pro deck?</h2>
            <p className="text-[12px] text-white/35 leading-relaxed">Você pode mudar essa preferência depois no Perfil.</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onChoose("1h")}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.09] hover:border-amber-500/30 transition"
            >
              <span className="text-xl">⚡</span>
              <span className="text-sm font-semibold text-white">Em 1 hora</span>
              <span className="text-[10px] text-white/35">Volta logo</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onChoose("1d")}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-[#2563eb]/15 border border-[#2563eb]/30 hover:bg-[#2563eb]/25 transition"
            >
              <span className="text-xl">🌅</span>
              <span className="text-sm font-semibold text-white">No dia seguinte</span>
              <span className="text-[10px] text-[#93c5fd]/70">Recomendado</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
