import { useState, useEffect } from "react";
import MainApp from "./MainApp.jsx";
import CobrancaPage from "./CobrancaPage.jsx";
import BoraPage from "./components/BoraPage.jsx";
import { Landing } from "./components/Landing.jsx";
import { supabase } from "./supabaseClient";
import { SK, save } from "./lib/storage.js";
import { temDadosLocais, telaInicial } from "./lib/landing.js";

function getRoute() {
  const h = window.location.hash;
  if (h.startsWith("#/cobranca/")) return "cobranca";
  if (h.startsWith("#/bora/"))   return "bora";
  return "app";
}

// Só lê a sessão pra decidir entre Landing e app — o resto do auth continua no
// useAuth do MainApp. Com dados locais nem consulta (vai direto pro app).
// Se o Supabase não responder (ex.: offline com token vencido), desiste em 4s e
// segue como sem login: a Landing não depende de rede e "Começar" entra no app.
function useSessaoInicial(ativo) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!ativo) return;
    if (!supabase) { setSession(null); return; }
    let vivo = true;
    const timer = setTimeout(() => { if (vivo) setSession(s => (s === undefined ? null : s)); }, 4000);
    supabase.auth.getSession().then(({ data }) => { if (vivo) setSession(data.session ?? null); }).catch(() => { if (vivo) setSession(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (vivo) setSession(s ?? null); });
    return () => { vivo = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, [ativo]);
  return session;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  // Vira true de vez quando o app abre (dados locais, "Começar" ou login): um
  // logout depois não devolve ninguém pra Landing.
  const [noApp, setNoApp] = useState(temDadosLocais);
  const session = useSessaoInicial(route === "app" && !noApp);
  useEffect(() => { if (session) setNoApp(true); }, [session]);

  useEffect(() => {
    function onHash() { setRoute(getRoute()); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "cobranca") return <CobrancaPage />;
  if (route === "bora")   return <BoraPage />;

  const tela = telaInicial({ session, temDados: noApp });
  if (tela === "carregando") return <div className="min-h-[100dvh] bg-app" />;
  if (tela === "landing") {
    return <Landing onStart={() => { save(SK.landingSeen, true); setNoApp(true); }} />;
  }
  return <MainApp />;
}
