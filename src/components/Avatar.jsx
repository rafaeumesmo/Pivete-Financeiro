import { User } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { AVATAR_PADRAO } from "../config.js";

// Avatar redondo. O emoji escolhido é conteúdo do usuário; sem escolha (vazio
// ou o 👤 padrão, que é o default gravado no Supabase) vira o ícone User.
// `className` define tamanho e corpo do emoji; `iconSize` o do ícone.
export function Avatar({ emoji, className = "w-10 h-10 text-xl", iconSize = 18, destaque = false }) {
  const padrao = !emoji || emoji === AVATAR_PADRAO;
  return (
    <span className={`rounded-full flex items-center justify-center flex-shrink-0 select-none bg-tile border ${destaque ? "border-brand" : "border-line"} ${className}`}>
      {padrao ? <User size={iconSize} strokeWidth={ICON_STROKE} className="text-fg-2" aria-hidden /> : emoji}
    </span>
  );
}
