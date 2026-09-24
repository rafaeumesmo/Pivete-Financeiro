import { motion } from "framer-motion";

export function ActionButtons({ onAction, disabled }) {
  const buttons = [
    { id: "left", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>, color: "border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400", size: "w-14 h-14" },
    { id: "up",   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>, color: "border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400", size: "w-12 h-12" },
    { id: "right", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>, color: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400", size: "w-14 h-14" },
  ];
  return (
    <div className="flex items-center justify-center gap-5">
      {buttons.map((btn) => (
        <motion.button key={btn.id} onClick={() => !disabled && onAction(btn.id)} disabled={disabled} className={`${btn.size} rounded-full border-2 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${btn.color} disabled:opacity-30 disabled:cursor-not-allowed`} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}>{btn.icon}</motion.button>
      ))}
    </div>
  );
}
