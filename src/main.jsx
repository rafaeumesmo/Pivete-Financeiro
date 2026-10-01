import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { iniciarTema } from "./lib/theme.js";
import { iniciarArmazenamento } from "./lib/storage.js";
import { supabase } from "./supabaseClient";
import { assinanteEmCache } from "./lib/assinatura.js";

// Logado com assinatura ativa → dados no localStorage; sem login ou sem
// assinatura → só na aba. (A assinatura é conferida no servidor logo depois.)
// (storageKey é onde o supabase-js guarda a sessão; é "protected" só no .d.ts.)
function usuarioDaSessaoSalva() {
  try {
    if (!supabase) return null;
    return JSON.parse(localStorage.getItem(supabase.auth.storageKey))?.user?.id ?? null;
  } catch { return null; }
}

const uid = usuarioDaSessaoSalva();
iniciarArmazenamento({ logado: !!uid && assinanteEmCache(uid) });
iniciarTema();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
