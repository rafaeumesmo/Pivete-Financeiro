import { useEffect, useState } from "react";
import { SK, load, save, REMOTE_UPDATE_EVENT } from "./storage.js";

// Tema claro/escuro (padrão: claro). A escolha fica em SK.tema — que está em SYNC_KEYS, então
// logado ela acompanha a conta em qualquer aparelho. As cores em si são
// variáveis CSS trocadas pelo data-theme do <html> (tailwind.config.js).
const EVENT = "fin:tema";
const FUNDO = { escuro: "#111114", claro: "#F4F5F7" };

export function getTema() {
  return load(SK.tema, "claro") === "escuro" ? "escuro" : "claro";
}

function aplicar(tema) {
  const root = document.documentElement;
  root.dataset.theme = tema === "claro" ? "light" : "dark";
  root.style.colorScheme = tema === "claro" ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", FUNDO[tema]);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function setTema(tema) {
  save(SK.tema, tema === "escuro" ? "escuro" : "claro");
  aplicar(getTema());
}

// Chamado uma vez no boot: aplica o salvo e segue o que chegar do servidor.
export function iniciarTema() {
  aplicar(getTema());
  window.addEventListener(REMOTE_UPDATE_EVENT, (e) => { if (e.detail?.key === SK.tema) aplicar(getTema()); });
}

export function useTema() {
  const [tema, setLocal] = useState(getTema);
  useEffect(() => {
    const f = () => setLocal(getTema());
    window.addEventListener(EVENT, f);
    return () => window.removeEventListener(EVENT, f);
  }, []);
  return [tema, setTema];
}
