import { motion } from "framer-motion";
import { X, Check, Split } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";

// labels: { left, up?, right } — sem `up`, o botão do meio some.
export function ActionButtons({ onAction, disabled, labels }) {
  const buttons = [
    { id: "left",  Icon: X,     tone: "text-neg",       size: "w-14 h-14", icon: 24 },
    { id: "up",    Icon: Split, tone: "text-brand-ink", size: "w-11 h-11", icon: 20 },
    { id: "right", Icon: Check, tone: "text-pos",       size: "w-14 h-14", icon: 24 },
  ].filter(b => labels?.[b.id]);
  return (
    <div className="flex items-start justify-center gap-8">
      {buttons.map(({ id, Icon, tone, size, icon }) => (
        <div key={id} className="flex flex-col items-center gap-1.5 w-20">
          <div className="h-14 flex items-center"><motion.button
            type="button"
            onClick={() => !disabled && onAction(id)}
            disabled={disabled}
            aria-label={labels[id]}
            className={`${size} rounded-full border border-line bg-surface shadow flex items-center justify-center ${tone} hover:bg-tile transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
            whileTap={{ scale: 0.92 }}
          >
            <Icon size={icon} strokeWidth={ICON_STROKE} aria-hidden />
          </motion.button></div>
          <span className="text-[12px] text-fg-2 text-center leading-tight" aria-hidden>{labels[id]}</span>
        </div>
      ))}
    </div>
  );
}
