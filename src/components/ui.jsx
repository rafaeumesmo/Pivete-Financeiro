// Peças visuais pequenas repetidas nas abas Atividade/Perfil.
import { useOcultarValores } from "../lib/privacy.js";

export const inputCls = "w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition";
export const labelCls = "block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2";

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35">{children}</p>
      {action}
    </div>
  );
}

export function SmallButton({ children, onClick, tone = "neutral", className = "", ...rest }) {
  const tones = {
    neutral: "bg-white/[0.06] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1]",
    blue:    "bg-[#2563eb]/15 border-[#2563eb]/30 text-blue-300 hover:bg-[#2563eb]/25",
    green:   "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25",
    red:     "bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/20",
  };
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition ${tones[tone]} ${className}`} {...rest}>{children}</button>
  );
}

export function EmptyHint({ icon, title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] px-5 py-8 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-semibold text-white/70 mb-1">{title}</p>
      {children && <p className="text-[12px] text-white/35 leading-relaxed mb-3">{children}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ pct, color = "#2563eb", label }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// Botão de olho que liga/desliga "esconder valores" (lib/privacy.js). O estado
// é global: alternar aqui vale pra todas as telas.
export function EyeButton({ className = "" }) {
  const [ocultar, setOcultar] = useOcultarValores();
  const label = ocultar ? "Mostrar valores" : "Esconder valores";
  return (
    <button
      type="button"
      onClick={() => setOcultar(!ocultar)}
      aria-pressed={ocultar}
      aria-label={label}
      title={label}
      className={`flex-shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/[0.05] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.09] transition ${className}`}
    >
      {ocultar ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      )}
    </button>
  );
}
