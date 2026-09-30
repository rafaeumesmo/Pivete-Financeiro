import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { Brand } from "./Brand.jsx";
import { OBMiniCard } from "./Onboarding.jsx";
import { AuthScreen } from "./AuthScreen.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { formatBRL } from "../lib/money.js";
import { APP_NAME } from "../config.js";

// Landing pra quem chega sem sessão e sem dados locais (regra em lib/landing.js).
// Não repete o Onboarding: aqui é o "por quê"; o passo a passo fica lá.

export const LANDING_FRASE = "Sem planilha, sem conectar banco. Suas contas viram cards e você decide em um gesto.";

const DESTAQUES = [
  { icon: "🏦", titulo: "Seu banco fica de fora", texto: "Não pedimos senha nem acesso à sua conta bancária." },
  { icon: "👆", titulo: "Decide, não só anota",   texto: "Veja o que vence e escolha: pagar, adiar ou dividir." },
  { icon: "🤝", titulo: "Dividir sem climão",     texto: "Manda o link de cobrança pro amigo, com sua chave Pix se quiser. Ele marca que pagou sem precisar de conta." },
];

const GESTOS = [
  { id: "adiar",   label: "← Adiar",   on: "text-red-400" },
  { id: "dividir", label: "↑ Dividir", on: "text-blue-400" },
  { id: "paguei",  label: "Paguei →",  on: "text-emerald-400" },
];

function Demo() {
  const reduzir = useReducedMotion();
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const [ativo, setAtivo] = useState(null);

  useEffect(() => {
    if (reduzir) return; // estático, com as 3 setas acesas
    let dead = false;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const volta = { type: "spring", stiffness: 300, damping: 22 };
    const vai = { duration: 0.42, ease: "easeOut" };
    (async () => {
      while (!dead) {
        for (const [gesto, mv, alvo] of [["paguei", cardX, 140], ["adiar", cardX, -140], ["dividir", cardY, -120]]) {
          await wait(600); if (dead) return;
          setAtivo(gesto);
          await animate(mv, alvo, vai);
          await wait(550); if (dead) return;
          await animate(mv, 0, volta);
          if (dead) return;
          setAtivo(null);
        }
      }
    })();
    return () => { dead = true; };
  }, [reduzir]); // eslint-disable-line react-hooks/exhaustive-deps -- motion values são estáveis

  return (
    <div className="flex flex-col items-center gap-4" aria-label="Exemplo: arraste o card da conta para a direita (paguei), esquerda (adiar) ou para cima (dividir)">
      <div className="flex justify-center" style={{ height: 256 }}>
        <OBMiniCard cardX={cardX} cardY={cardY} valor={formatBRL(9990)} vence="Vence dia 10" />
      </div>
      <div className="flex gap-2">
        {GESTOS.map(g => {
          const aceso = reduzir || ativo === g.id;
          return (
            <span key={g.id} className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-colors duration-200 ${aceso ? `${g.on} border-white/15 bg-white/[0.07]` : "text-white/30 border-white/[0.06]"}`}>
              {g.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AuthSheet({ onClose }) {
  const auth = useAuth();
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-sidebar rounded-3xl w-full max-w-sm border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h3 className="font-bold text-white text-base">Entrar no {APP_NAME}</h3>
          <button onClick={onClose} aria-label="Fechar" className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition text-sm">✕</button>
        </div>
        <AuthScreen onSendLink={auth.sendMagicLink} onGoogle={auth.signInWithGoogle} />
      </motion.div>
    </motion.div>
  );
}

function isStandalone() {
  try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
  catch { return false; }
}

export function Landing({ onStart, saiu = false }) {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [showAuth, setShowAuth] = useState(false);
  const [standalone] = useState(isStandalone);
  useEffect(() => { function h() { setIsDesktop(window.innerWidth >= 1024); } window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  const hero = (
    <div className={isDesktop ? "text-left" : "text-center"}>
      <h1 className="text-[32px] lg:text-[44px] font-black tracking-tight leading-none text-white"><Brand icon iconSize="1.1em" /></h1>
      <p className="mt-3 text-[15px] lg:text-[18px] text-white/60 leading-relaxed max-w-md mx-auto lg:mx-0">{LANDING_FRASE}</p>
    </div>
  );

  // Depois do logout a ordem inverte: entrar de novo é o principal.
  const principal = saiu ? { label: "Entrar", onClick: () => setShowAuth(true) } : { label: "Começar", onClick: onStart };
  const secundario = saiu ? { label: "Usar sem conta", onClick: onStart } : { label: "Já tenho conta", onClick: () => setShowAuth(true) };
  const ctas = (
    <div className={`flex flex-col gap-2.5 w-full max-w-sm ${isDesktop ? "" : "mx-auto"}`}>
      {saiu && (
        <p className={`text-[13px] text-white/60 leading-relaxed rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 mb-1 ${isDesktop ? "" : "text-center"}`}>
          👋 Você saiu da sua conta. Seus dados continuam salvos nela: é só entrar de novo.
        </p>
      )}
      <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={principal.onClick} className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition">
        {principal.label}
      </motion.button>
      <button type="button" onClick={secundario.onClick} className="w-full py-3 rounded-2xl text-sm font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition">
        {secundario.label}
      </button>
      {!standalone && (
        <p className={`text-[11px] text-white/25 mt-1 ${isDesktop ? "" : "text-center"}`}>
          📲 Instale na tela inicial pelo menu do navegador.
        </p>
      )}
    </div>
  );

  const destaques = (
    <ul className={isDesktop ? "grid grid-cols-3 gap-4" : "flex flex-col gap-2.5"}>
      {DESTAQUES.map(d => (
        <li key={d.titulo} className={`rounded-2xl bg-white/[0.04] border border-white/[0.07] ${isDesktop ? "p-5" : "px-4 py-3 flex gap-3 items-start"}`}>
          <span className={isDesktop ? "text-2xl block mb-2" : "text-xl leading-none mt-0.5"} aria-hidden="true">{d.icon}</span>
          <div>
            <p className="text-[14px] font-semibold text-white">{d.titulo}</p>
            <p className="text-[12.5px] text-white/45 leading-relaxed mt-0.5">{d.texto}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="min-h-[100dvh] w-full bg-app overflow-x-hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        paddingLeft: "max(env(safe-area-inset-left), 20px)",
        paddingRight: "max(env(safe-area-inset-right), 20px)",
      }}
    >
      {isDesktop ? (
        <div className="max-w-5xl mx-auto min-h-[calc(100dvh-48px)] flex flex-col justify-center gap-12">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">{hero}{ctas}</div>
            <Demo />
          </div>
          {destaques}
        </div>
      ) : (
        <div className="max-w-md mx-auto flex flex-col gap-6">
          {hero}
          {saiu ? <>{ctas}<Demo />{destaques}</> : <><Demo />{destaques}{ctas}</>}
        </div>
      )}
      <AnimatePresence>{showAuth && <AuthSheet key="auth" onClose={() => setShowAuth(false)} />}</AnimatePresence>
    </div>
  );
}
