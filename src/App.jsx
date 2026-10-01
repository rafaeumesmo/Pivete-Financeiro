import { useState, useEffect } from "react";
import MainApp from "./MainApp.jsx";
import CobrancaPage from "./CobrancaPage.jsx";
import BoraPage from "./components/BoraPage.jsx";
import { Landing } from "./components/Landing.jsx";
import { supabase } from "./supabaseClient";
import { SK, load, save, dadosPersistentes, tornarTemporario } from "./lib/storage.js";
import { telaInicial } from "./lib/landing.js";
import { lembrarAssinante } from "./lib/assinatura.js";

function getRoute() {
  const h = window.location.hash;
  if (h.startsWith("#/cobranca/")) return "cobranca";
  if (h.startsWith("#/bora/"))   return "bora";
  return "app";
}

// Só lê a sessão pra decidir entre Landing e app — o resto do auth continua no
// useAuth do MainApp. Se o Supabase não responder (ex.: offline com token
// vencido), desiste em 4s e segue como sem login: a Landing não depende de rede.
// onSaiu: qualquer logout (botão Sair, outra aba, sessão invalidada).
function useSessao(ativo, onSaiu) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!ativo) return;
    if (!supabase) { setSession(null); return; }
    let vivo = true;
    const timer = setTimeout(() => { if (vivo) setSession(s => (s === undefined ? null : s)); }, 4000);
    supabase.auth.getSession().then(({ data }) => { if (vivo) setSession(data.session ?? null); }).catch(() => { if (vivo) setSession(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => {
      if (!vivo) return;
      setSession(s ?? null);
      if (evento === "SIGNED_OUT") onSaiu();
    });
    return () => { vivo = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, [ativo]); // eslint-disable-line react-hooks/exhaustive-deps -- onSaiu só mexe em estado/storage, não precisa reassinar
  return session;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  // noApp: logado neste aparelho, já clicou "Começar" nesta aba, ou entrou.
  // saiu: deslogou — volta pra Landing, com "Entrar" em destaque, até logar
  // de novo ou escolher usar sem conta. Fica salvo pra sobreviver a reload.
  const [noApp, setNoApp] = useState(() => dadosPersistentes() || load(SK.landingSeen, false));
  const [saiu, setSaiu] = useState(() => load(SK.saiuDaConta, false));
  const session = useSessao(route === "app", () => { tornarTemporario(); lembrarAssinante(null); save(SK.saiuDaConta, true); setSaiu(true); });
  useEffect(() => {
    if (!session) return;
    setNoApp(true);
    if (load(SK.saiuDaConta, false)) { save(SK.saiuDaConta, false); setSaiu(false); }
  }, [session]);

  useEffect(() => {
    function onHash() { setRoute(getRoute()); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "cobranca") return <CobrancaPage />;
  if (route === "bora")   return <BoraPage />;

  const tela = telaInicial({ session, jaNoApp: noApp, saiu });
  if (tela === "carregando") return <div className="min-h-[100dvh] bg-app" />;
  if (tela === "landing") {
    return (
      <Landing
        saiu={saiu}
        onStart={() => { save(SK.landingSeen, true); save(SK.saiuDaConta, false); setSaiu(false); setNoApp(true); }}
      />
    );
  }
  return <MainApp />;
}
