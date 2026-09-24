import { motion } from "framer-motion";

export function EmptyState({ stats, onReset, onNavigate }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-6xl mb-5">🎉</div>
      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Deck Finalizado!</h3>
      <p className="text-white/40 text-sm mb-6 leading-relaxed">Suas decisões foram registradas.</p>
      <div className="flex gap-4 mb-6">
        {[{ label: "Feitos", value: stats.accepted, color: "text-emerald-400" }, { label: "Fazer", value: stats.rejected, color: "text-red-400" }, { label: "Delegados", value: stats.shared, color: "text-blue-400" }].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-white/40 mt-0.5">{label}</span>
          </div>
        ))}
      </div>
      <div className="w-full flex flex-col gap-2">
        <motion.button onClick={onReset} className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-white font-semibold text-sm tracking-wide hover:bg-blue-500 transition-colors" whileTap={{ scale: 0.97 }}>+ Criar nova tarefa</motion.button>
        {onNavigate && (
          <div className="flex gap-2">
            <motion.button onClick={() => onNavigate("activity")} className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white/50 text-sm hover:text-white/70 transition" whileTap={{ scale: 0.97 }}>Ver atividade</motion.button>
            <motion.button onClick={() => onNavigate("social")} className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-white/50 text-sm hover:text-white/70 transition" whileTap={{ scale: 0.97 }}>Social</motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
