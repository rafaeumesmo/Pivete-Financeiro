export function IOSToggle({ value, onChange, disabled = false }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)} className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${value && !disabled ? "bg-brand" : "bg-fg-3/40"}`} aria-checked={value} role="switch">
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#fff] shadow transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}
