// Peças visuais pequenas repetidas nas abas Atividade/Perfil.
import { Eye, EyeOff } from "lucide-react";
import { useOcultarValores } from "../lib/privacy.js";
import { ICON_STROKE } from "../lib/icons.js";

export const inputCls = "w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-fg-3 transition";
export const labelCls = "block text-[13px] font-medium text-fg-2 mb-1.5";

// Botões: um primário por tela (fundo de marca), o resto secundário/ghost.
export const btnCls = {
  primary:   "inline-flex items-center justify-center gap-2 rounded-md bg-brand text-on-brand font-semibold hover:bg-brand-hover transition disabled:opacity-50",
  secondary: "inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface text-fg font-semibold hover:bg-tile transition disabled:opacity-50",
  ghost:     "inline-flex items-center justify-center gap-2 rounded-md text-fg-2 font-medium hover:text-fg hover:bg-tile transition disabled:opacity-50",
};

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-[15px] font-semibold text-fg">{children}</p>
      {action}
    </div>
  );
}

export function SmallButton({ children, onClick, tone = "neutral", className = "", ...rest }) {
  const tones = {
    neutral: "text-fg",
    blue:    "text-brand-ink",
    green:   "text-pos",
    red:     "text-neg",
  };
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-md border border-line bg-surface hover:bg-tile text-[13px] font-semibold transition ${tones[tone]} ${className}`} {...rest}>{children}</button>
  );
}

// `icon` é um componente do lucide-react.
export function EmptyHint({ icon: Icon, title, children, action }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-5 py-8 text-center">
      {Icon && typeof Icon !== "string" && (
        <span className="mx-auto mb-3 w-10 h-10 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><Icon size={20} strokeWidth={ICON_STROKE} /></span>
      )}
      <p className="text-sm font-semibold text-fg mb-1">{title}</p>
      {children && <p className="text-[13px] text-fg-2 leading-relaxed mb-3">{children}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ pct, color = "rgb(var(--brand))", label }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 rounded-sm bg-tile overflow-hidden" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-sm transition-all duration-500" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// Botão de olho que liga/desliga "esconder valores" (lib/privacy.js). O estado
// é global: alternar aqui vale pra todas as telas.
export function EyeButton({ className = "" }) {
  const [ocultar, setOcultar] = useOcultarValores();
  const label = ocultar ? "Mostrar valores" : "Esconder valores";
  const Icon = ocultar ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={() => setOcultar(!ocultar)}
      aria-pressed={ocultar}
      aria-label={label}
      title={label}
      className={`flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-md text-fg-2 hover:text-fg transition ${className}`}
    >
      <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
    </button>
  );
}
