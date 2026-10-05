import { House, Users, History, User } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { NavBadge } from "./NavBadge.jsx";
import { Brand, CatIcon } from "./Brand.jsx";
import { StreakFlame } from "./StreakWidgets.jsx";

export const NAV_ITEMS = [
  { id: "home",     label: "Início",    Icon: House },
  { id: "social",   label: "Social",    Icon: Users },
  { id: "activity", label: "Atividade", Icon: History },
  { id: "profile",  label: "Perfil",    Icon: User },
];

// Desktop: 240px com rótulos. Tablet (compact): só ícones.
export function Sidebar({ compact, activeTab, onTab, badges, streak, onStreak, footer }) {
  return (
    <aside className={`${compact ? "w-[72px] px-2 items-center" : "w-[240px] px-3"} flex-shrink-0 bg-surface border-r border-line flex flex-col py-5`}>
      <div className={`mb-6 flex items-center ${compact ? "flex-col gap-3" : "justify-between px-2"}`}>
        {compact
          ? <span className="text-brand-ink text-[28px] leading-none" title="Início"><CatIcon size="1em" /></span>
          : <span className="text-[17px] font-bold tracking-tight leading-tight text-fg"><Brand icon iconSize="1.5em" /></span>}
        <StreakFlame count={streak} onClick={onStreak} compact={compact} />
      </div>
      <nav className={`flex flex-col gap-1 ${compact ? "items-center" : ""}`}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const ativo = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              aria-current={ativo ? "page" : undefined}
              aria-label={compact ? label : undefined}
              title={compact ? label : undefined}
              className={`flex items-center rounded-md transition ${compact ? "w-11 h-11 justify-center" : "gap-3 px-3 py-2.5"} ${ativo ? "bg-tile text-brand-ink" : "text-fg-2 hover:bg-tile hover:text-fg"}`}
            >
              <span className="relative flex-shrink-0"><Icon size={20} strokeWidth={ICON_STROKE} aria-hidden /><NavBadge count={badges[id] || 0} /></span>
              {!compact && <span className="text-[14px] font-medium">{label}</span>}
            </button>
          );
        })}
      </nav>
      {footer && <div className={`mt-auto pt-4 ${compact ? "" : "px-1"}`}>{footer}</div>}
    </aside>
  );
}

// Mobile: pílula escura flutuante. Ativo = fundo de marca + rótulo.
// on-color: parent bg-nav — itens inativos ficam direto na pílula.
export function BottomNav({ activeTab, onTab, badges }) {
  return (
    <nav className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1.5 rounded-full bg-nav shadow" style={{ bottom: "max(env(safe-area-inset-bottom), 16px)" }} aria-label="Navegação principal">
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const ativo = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-current={ativo ? "page" : undefined}
            aria-label={label}
            className={`flex items-center gap-2 h-11 rounded-full transition-colors ${ativo ? "bg-brand text-on-brand px-4" : "text-on-nav w-12 justify-center opacity-70 hover:opacity-100"}`}
          >
            <span className="relative"><Icon size={20} strokeWidth={ICON_STROKE} aria-hidden /><NavBadge count={badges[id] || 0} /></span>
            {ativo && <span className="text-[13px] font-semibold">{label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
