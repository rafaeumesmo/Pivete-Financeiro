import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css";
import App from "./App";
import { iniciarTema } from "./lib/theme.js";
import { iniciarArmazenamento } from "./lib/storage.js";
import { mesDeExemplo } from "./lib/exemplo.js";
import { todayKey } from "./lib/dates.js";
import { temSessaoSalva } from "./supabaseClient";

// conta (tem sessão) | legado (dados reais de convidado no aparelho) | exemplo
iniciarArmazenamento({ temSessao: temSessaoSalva(), exemplo: () => mesDeExemplo(todayKey()) });
iniciarTema();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
