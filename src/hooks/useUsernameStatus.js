import { useState, useEffect } from "react";
import { normalizeUsername, validateUsername } from "../lib/username";

/*
 * Verifica em tempo real (debounce 400ms) se um username está disponível.
 * checkUsername: fn assíncrona (do useAuth) que consulta o banco e já ignora
 *   o próprio registro do usuário logado.
 * skipValue: username atual do usuário — se o valor digitado for igual a ele,
 *   considera disponível na hora, sem consultar (caso da edição mantendo o nick).
 *
 * Retorna: "idle" | "checking" | "available" | "taken" | "invalid" | "error".
 */
export function useUsernameStatus(rawValue, checkUsername, skipValue) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const uname = normalizeUsername(rawValue);
    if (!uname) { setStatus("idle"); return; }
    if (skipValue && uname === normalizeUsername(skipValue)) { setStatus("available"); return; }
    if (!validateUsername(uname)) { setStatus("invalid"); return; }

    let active = true;
    setStatus("checking");
    const t = setTimeout(async () => {
      try {
        const { available } = await checkUsername(uname);
        if (active) setStatus(available ? "available" : "taken");
      } catch {
        if (active) setStatus("error");
      }
    }, 400);
    return () => { active = false; clearTimeout(t); };
  }, [rawValue, skipValue, checkUsername]);

  return status;
}
