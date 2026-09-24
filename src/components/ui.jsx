// Peças visuais pequenas repetidas nas abas Atividade/Perfil.

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
    blue:    "bg-[#2563eb]/15 border-[#2563eb]/30 text-[#93c5fd] hover:bg-[#2563eb]/25",
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
