import { APP_NAME, BRAND_COLOR, brandParts } from "../config.js";

// Gatinho da marca (mesmo desenho do favicon em public/favicon.svg).
export function CatIcon({ size = "1em", className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11 V3.5 L9.5 7.2 Q12 6.5 14.5 7.2 L19 3.5 V11 Q20.5 13.5 19.8 16 Q18.5 20.5 12 20.5 Q5.5 20.5 4.2 16 Q3.5 13.5 5 11 Z" />
      <ellipse cx="9" cy="12.6" rx="1" ry="1.3" fill="currentColor" stroke="none" />
      <ellipse cx="15" cy="12.6" rx="1" ry="1.3" fill="currentColor" stroke="none" />
      <path d="M11 15.2 H13 L12 16.3 Z" fill="currentColor" strokeWidth="1" />
      <path d="M2 14 L6.5 14.8 M2.3 17 L6.6 16.2 M22 14 L17.5 14.8 M21.7 17 L17.4 16.2" strokeWidth="1.2" />
    </svg>
  );
}

export function Brand({ icon = false, iconSize = "1.15em" }) {
  const [a, b] = brandParts(APP_NAME);
  const text = <>{a}<span style={{ color: BRAND_COLOR }}>{b}</span></>;
  if (!icon) return text;
  return <span className="inline-flex items-center gap-1.5"><span style={{ color: BRAND_COLOR }} className="inline-flex shrink-0"><CatIcon size={iconSize} /></span><span>{text}</span></span>;
}
