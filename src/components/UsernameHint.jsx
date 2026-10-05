import { normalizeUsername } from "../lib/username";

/*
 * Linha de feedback de disponibilidade do username.
 * status: "idle" | "checking" | "available" | "taken" | "invalid" | "error"
 */
export function UsernameHint({ status, value }) {
  const uname = normalizeUsername(value);
  if (status === "idle" || !uname) return null;

  const map = {
    checking:  { color: "text-fg-2", text: "Verificando disponibilidade…" },
    available: { color: "text-pos", text: `@${uname} disponível` },
    taken:     { color: "text-neg", text: `@${uname} já está em uso, escolha outro` },
    invalid:   { color: "text-neg", text: "3–20 caracteres: letras, números, _ e ." },
    error:     { color: "text-warn", text: "Não deu pra verificar agora, tente de novo" },
  };
  const m = map[status] || map.checking;
  return <p className={`text-[12px] px-1 ${m.color}`}>{m.text}</p>;
}
