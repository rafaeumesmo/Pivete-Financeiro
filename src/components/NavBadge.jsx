import { motion, AnimatePresence } from "framer-motion";

export function NavBadge({ count }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="nb"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-sm bg-neg text-on-neg text-[9px] font-bold flex items-center justify-center px-[3px] leading-none pointer-events-none"
        >
          {count > 9 ? "9+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
