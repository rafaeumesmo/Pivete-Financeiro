import { useEffect, useState } from "react";
import { SK, load, save } from "./storage.js";

// Botão de olho: esconde os valores em R$ da tela (Perfil, Painel, Extrato,
// Calendário). Só mascara a exibição — os dados não mudam. A escolha fica no
// aparelho (fora de SYNC_KEYS): dá pra esconder no celular e não no computador.
const EVENT = "fin:ocultar-valores";

export function getOcultarValores() {
  return load(SK.ocultarValores, false) === true;
}

export function setOcultarValores(v) {
  save(SK.ocultarValores, !!v);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useOcultarValores() {
  const [ocultar, setLocal] = useState(getOcultarValores);
  useEffect(() => {
    const f = () => setLocal(getOcultarValores());
    window.addEventListener(EVENT, f);
    return () => window.removeEventListener(EVENT, f);
  }, []);
  return [ocultar, setOcultarValores];
}
