import { formatBRL } from "../lib/money.js";

// Campo de valor estilo caixa eletrônico: cada dígito entra pela direita
// (1 → R$ 0,01, 12 → R$ 0,12, 1234 → R$ 12,34). Com inputMode="numeric" o
// celular abre só o teclado numérico, e não tem vírgula/ponto pra errar.
// `value` e `onChange` trabalham em centavos (inteiro).
export function MoneyInput({ value, onChange, id, autoFocus, className = "", ariaLabel = "Valor" }) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    onChange(digits ? Number(digits) : 0);
  }
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      value={formatBRL(value || 0)}
      onChange={handleChange}
      // Mantém o cursor no fim: o texto é reformatado a cada tecla.
      onFocus={e => { const el = e.target; requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)); }}
      className={`tabular-nums ${className}`}
    />
  );
}
