import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { iniciarTema } from "./lib/theme.js";
import { iniciarArmazenamento } from "./lib/storage.js";
import { supabase } from "./supabaseClient";

// Tem sessão salva → dados no localStorage; sem login → só na aba.
// (storageKey é onde o supabase-js guarda a sessão; é "protected" só no .d.ts.)
function temSessaoSalva() {
  try { return !!supabase && localStorage.getItem(supabase.auth.storageKey) !== null; } catch { return false; }
}

iniciarArmazenamento({ logado: temSessaoSalva() });
iniciarTema();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
