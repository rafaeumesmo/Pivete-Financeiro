import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUp, ShieldCheck, Hand, Users, Smartphone } from "lucide-react";
import { Brand } from "./Brand.jsx";
import { OBMiniCard } from "./Onboarding.jsx";
import { AuthScreen } from "./AuthScreen.jsx";
import { Sheet } from "./Sheet.jsx";
import { btnCls } from "./ui.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useBreakpoint } from "../hooks/useBreakpoint.js";
import { formatBRL } from "../lib/money.js";
import { ICON_STROKE } from "../lib/icons.js";
import { APP_NAME } from "../config.js";

// Landing pra quem chega sem sessão e sem dados locais (regra em lib/landing.js).
// Não repete o Onboarding: aqui é o "por quê"; o passo a passo fica lá.
// A personalidade vem do texto (tom de "pivete"), não de emoji.

export const LANDING_TITULO = "Conta chegou? Arrasta e bola pra frente.";
export const LANDING_FRASE = "Sem planilha e sem entregar a senha do banco pra ninguém. Suas contas viram cards e você resolve cada uma num gesto.";

const DESTAQUES = [
  { Icon: ShieldCheck, titulo: "Seu banco fica de fora", texto: "A gente não pede senha nem acesso à sua conta. Você anota, o app organiza." },
  { Icon: Hand,        titulo: "Resolve no dedo",        texto: "Vê o que vence na semana e decide na hora: pagar, adiar ou dividir." },
  { Icon: Users,       titulo: "Racha sem climão",       texto: "Manda o link da cobrança pro parça, com sua chave Pix. Ele avisa que pagou sem nem criar conta." },
];

const GESTOS = [
  { id: "adiar",   label: "Adiar",   Icon: ArrowLeft,  on: "text-neg" },
  { id: "dividir", label: "Dividir", Icon: ArrowUp,    on: "text-brand-ink" },
  { id: "paguei",  label: "Paguei",  Icon: ArrowRight, on: "text-pos" },
];

function Demo() {
  const reduzir = useReducedMotion();
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const [ativo, setAtivo] = useState(null);

  useEffect(() => {
    if (reduzir) return; // estático, com os 3 gestos acesos
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
        {GESTOS.map(({ id, label, Icon, on }) => {
          const aceso = reduzir || ativo === id;
          return (
            <span key={id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[13px] font-semibold transition-colors duration-200 ${aceso ? `${on} border-line bg-surface` : "text-fg-3 border-transparent"}`}>
              <Icon size={14} strokeWidth={ICON_STROKE} aria-hidden />{label}
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
    <Sheet title={`Entrar no ${APP_NAME}`} onClose={onClose}>
      <AuthScreen onSendLink={auth.sendMagicLink} onGoogle={auth.signInWithGoogle} />
    </Sheet>
  );
}

function isStandalone() {
  try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
  catch { return false; }
}

export function Landing({ onStart, saiu = false }) {
  const isDesktop = useBreakpoint() === "desktop";
  const [showAuth, setShowAuth] = useState(false);
  const [standalone] = useState(isStandalone);
  const alinhar = isDesktop ? "text-left" : "text-center";

  const hero = (
    <div className={alinhar}>
      <p className="text-[17px] font-bold text-fg"><Brand icon iconSize="1.3em" /></p>
      <h1 className="mt-5 lg:mt-8 text-[30px] lg:text-[48px] font-bold tracking-tight leading-[1.1] text-fg text-balance">{LANDING_TITULO}</h1>
      <p className={`mt-3 lg:mt-4 text-[15px] lg:text-[18px] text-fg-2 leading-relaxed max-w-md ${isDesktop ? "" : "mx-auto"}`}>{LANDING_FRASE}</p>
    </div>
  );

  // Depois do logout a ordem inverte: entrar de novo é o principal.
  const principal = saiu ? { label: "Entrar", onClick: () => setShowAuth(true) } : { label: "Bora começar", onClick: onStart };
  const secundario = saiu ? { label: "Usar sem conta", onClick: onStart } : { label: "Já tenho conta", onClick: () => setShowAuth(true) };
  const ctas = (
    <div className={`flex flex-col gap-2.5 w-full max-w-sm ${isDesktop ? "" : "mx-auto"}`}>
      {saiu && (
        <p className={`text-[13px] text-fg-2 leading-relaxed rounded-md bg-tile px-4 py-3 mb-1 ${alinhar}`}>
          Você saiu da conta. Tá tudo guardado lá: é só entrar de novo.
        </p>
      )}
      <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={principal.onClick} className={`${btnCls.primary} w-full py-3.5 text-sm`}>
        {principal.label}
      </motion.button>
      <button type="button" onClick={secundario.onClick} className={`${btnCls.secondary} w-full py-3 text-sm`}>
        {secundario.label}
      </button>
      {!standalone && (
        <p className={`text-[12px] text-fg-3 mt-1 flex items-center gap-1.5 ${isDesktop ? "" : "justify-center"}`}>
          <Smartphone size={14} strokeWidth={ICON_STROKE} aria-hidden />Dá pra instalar na tela inicial pelo menu do navegador.
        </p>
      )}
    </div>
  );

  const destaques = (
    <ul className={isDesktop ? "grid grid-cols-3 gap-4" : "flex flex-col gap-2.5"}>
      {DESTAQUES.map(({ Icon, titulo, texto }) => (
        <li key={titulo} className={`rounded-lg bg-surface border border-line ${isDesktop ? "p-5" : "px-4 py-3.5 flex gap-3 items-start"}`}>
          <span className={`w-9 h-9 rounded-md bg-tile text-fg flex items-center justify-center flex-shrink-0 ${isDesktop ? "mb-3" : ""}`} aria-hidden>
            <Icon size={18} strokeWidth={ICON_STROKE} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-fg">{titulo}</p>
            <p className="text-[13px] text-fg-2 leading-relaxed mt-0.5">{texto}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="min-h-[100dvh] w-full bg-page overflow-x-hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        paddingLeft: "max(env(safe-area-inset-left), 16px)",
        paddingRight: "max(env(safe-area-inset-right), 16px)",
      }}
    >
      {isDesktop ? (
        <div className="max-w-5xl mx-auto min-h-[calc(100dvh-48px)] flex flex-col justify-center gap-14">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-8">{hero}{ctas}</div>
            <Demo />
          </div>
          {destaques}
        </div>
      ) : (
        <div className="max-w-md mx-auto flex flex-col gap-7">
          {hero}
          {saiu ? <>{ctas}<Demo />{destaques}</> : <><Demo />{destaques}{ctas}</>}
        </div>
      )}
      <AnimatePresence>{showAuth && <AuthSheet key="auth" onClose={() => setShowAuth(false)} />}</AnimatePresence>
    </div>
  );
}
