import { motion } from "framer-motion";
import { CircleCheck, CircleAlert, Clock, Info } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";

// `color` ainda vem como classe de fundo (bg-emerald-…, bg-red-…); aqui ela só
// escolhe o ícone/tom. O toast em si é sempre neutro escuro.
// on-color: parent bg-nav — o ícone fica dentro da caixa do toast.
function tom(color = "") {
  if (color.includes("emerald")) return { Icon: CircleCheck, cls: "text-pos" };
  if (color.includes("red"))     return { Icon: CircleAlert, cls: "text-neg" };
  if (color.includes("amber"))   return { Icon: Clock,       cls: "text-warn" };
  if (color.includes("blue") || color.includes("2563eb")) return { Icon: Info, cls: "text-on-nav" };
  return null;
}

export function Toast({ message, color, visible }) {
  const t = tom(color);
  return (
    // Centralização fica no wrapper: o transform do framer (y) apagaria um -translate-x-1/2.
    <div className="fixed bottom-32 inset-x-4 z-50 flex justify-center pointer-events-none">
      <motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }} className="max-w-full flex items-center gap-2 px-4 py-3 rounded-md bg-nav text-on-nav text-sm font-medium shadow">
        {t && <t.Icon size={18} strokeWidth={ICON_STROKE} className={`flex-shrink-0 ${t.cls}`} aria-hidden />}
        <span>{message}</span>
      </motion.div>
    </div>
  );
}
