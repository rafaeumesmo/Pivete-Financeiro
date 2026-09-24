import { motion } from "framer-motion";

export function Toast({ message, color, visible }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }} className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-xl pointer-events-none ${color}`}>
      {message}
    </motion.div>
  );
}
