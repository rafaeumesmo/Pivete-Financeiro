import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUp, ShieldCheck, Layers, Users, Smartphone, Check } from "lucide-react";
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
import { MOTIVOS_CONTA } from "../lib/convidado.js";

// Landing pra quem chega sem sessão e ainda não começou (regra em lib/landing.js).
// Não repete o Onboarding: aqui é o "por quê"; o passo a passo fica lá.
// A personalidade vem do texto (tom de "pivete"), não de emoji.
// "Ver como funciona" abre o mês de exemplo (sem conta, nada fica salvo);
// "Criar conta" leva ao login e ao onboarding com os dados da pessoa.

export const LANDING_TITULO = "Conta chegou? Arraste e bola pra frente.";
export const LANDING_FRASE = "Sem planilha e sem entregar a senha do banco pra ninguém. Suas contas viram cards e você resolve cada uma num gesto.";

const DESTAQUES = [
  { Icon: Layers,      titulo: "Uma conta por vez",        texto: "Cada conta vira um card. Pagou? Arraste pro lado. Não rola agora? Adie. Sem planilha." },
  { Icon: ShieldCheck, titulo: "Não pede acesso ao banco", texto: "Nada de senha nem de conectar conta. Você anota, o app organiza." },
  { Icon: Users,       titulo: "Cobrar amigo sem climão",  texto: "Mande o link da cobrança pro parça, com a chave Pix. Ele avisa que pagou sem nem baixar o app." },
];

// Só o que já existe. Não tem plano pago: o projeto é open source.
const GRATIS = ["Swipe das contas", "Lançamentos e fixos", "Caixinhas", "Painel", "Sequência e conquistas", "Cobrança e Bora?"];

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

// motivo: só no "Criar conta" (o "Entrar" do topo é pra quem já tem conta).
function AuthSheet({ onClose, motivo = null }) {
  const auth = useAuth();
  return (
    <Sheet title={motivo ? "Criar conta ou entrar" : `Entrar no ${APP_NAME}`} onClose={onClose}>
      <div className="-mx-5 -mb-5"><AuthScreen motivo={motivo} onSendLink={auth.sendMagicLink} onGoogle={auth.signInWithGoogle} /></div>
    </Sheet>
  );
}

function isStandalone() {
  try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
  catch { return false; }
}

export function Landing({ onStart, saiu = false }) {
  const isDesktop = useBreakpoint() === "desktop";
  const [showAuth, setShowAuth] = useState(false); // false | "entrar" | "criar"
  const [standalone] = useState(isStandalone);
  const alinhar = isDesktop ? "text-left" : "text-center";

  // "Ver como funciona" abre o mês de exemplo; "Criar conta" começa com os
  // dados da pessoa. Depois do logout, entrar de novo vem primeiro.
  const cta = (extra = "") => (
    <div className={`flex flex-col gap-2.5 w-full max-w-sm ${isDesktop ? "" : "mx-auto"} ${extra}`}>
      {saiu ? (
        <>
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => setShowAuth("entrar")} className={`${btnCls.primary} w-full py-3.5 text-[15px]`}>Entrar de novo</motion.button>
          <button type="button" onClick={onStart} className={`${btnCls.secondary} w-full py-3 text-sm`}>Ver como funciona</button>
        </>
      ) : (
        <>
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onStart} className={`${btnCls.primary} w-full py-3.5 text-[15px]`}>Ver como funciona</motion.button>
          <button type="button" onClick={() => setShowAuth("criar")} className={`${btnCls.secondary} w-full py-3 text-sm`}>Criar conta</button>
        </>
      )}
    </div>
  );

  const topo = (
    <header className="flex items-center justify-between">
      <span className="text-[16px] font-bold text-fg"><Brand icon iconSize="1.3em" /></span>
      <button type="button" onClick={() => setShowAuth("entrar")} className={`${btnCls.ghost} h-9 px-3 text-[13px]`}>Entrar</button>
    </header>
  );

  const hero = (
    <div className={alinhar}>
      {saiu && (
        <p className={`text-[13px] text-fg-2 leading-relaxed rounded-md bg-tile px-4 py-3 mb-6 max-w-sm ${isDesktop ? "" : "mx-auto"}`}>
          Você saiu da conta. Tá tudo guardado lá: é só entrar de novo.
        </p>
      )}
      <h1 className="text-[30px] lg:text-[48px] font-bold tracking-tight leading-[1.1] text-fg text-balance">{LANDING_TITULO}</h1>
      <p className={`mt-3 lg:mt-4 text-[15px] lg:text-[18px] text-fg-2 leading-relaxed max-w-md ${isDesktop ? "" : "mx-auto"}`}>{LANDING_FRASE}</p>
      {cta("mt-7")}
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

  const preco = (
    <section aria-labelledby="preco" className="flex flex-col gap-4">
      <h2 id="preco" className={`text-[22px] lg:text-[28px] font-bold tracking-tight text-fg ${alinhar}`}>Quanto custa? Nada.</h2>
      <div className={isDesktop ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}>
        <div className="rounded-lg bg-surface border border-line p-5">
          <p className="text-[15px] font-semibold text-fg">Grátis pra usar</p>
          <p className="text-[28px] font-bold tracking-tight text-fg tabular-nums mt-1">R$ 0</p>
          <ul className="mt-4 flex flex-col gap-2">
            {GRATIS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[14px] text-fg">
                <Check size={16} strokeWidth={ICON_STROKE} className="text-pos flex-shrink-0" aria-hidden />{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-tile border border-line p-5">
          <p className="text-[15px] font-semibold text-fg">Código aberto</p>
          <p className="text-[28px] font-bold tracking-tight text-fg tabular-nums mt-1">Sem plano pago</p>
          <p className="mt-4 text-[14px] text-fg-2 leading-relaxed">O Pivete é open source: o código fica aberto pra qualquer um ver como funciona. Sem assinatura e sem pegadinha.</p>
        </div>
      </div>
    </section>
  );

  const fim = (
    <section className={`rounded-lg bg-surface border border-line ${isDesktop ? "p-10 flex items-center justify-between gap-8" : "p-6 flex flex-col gap-5 text-center"}`}>
      <div>
        <p className="text-[20px] lg:text-[24px] font-bold tracking-tight text-fg">Bora organizar essa bagunça?</p>
        <p className="text-[14px] text-fg-2 mt-1">Dá uma volta num mês de exemplo antes de criar conta.</p>
      </div>
      {cta(isDesktop ? "lg:max-w-[280px]" : "")}
    </section>
  );

  const instalar = !standalone && (
    <p className={`text-[12px] text-fg-3 flex items-center gap-1.5 ${isDesktop ? "" : "justify-center"}`}>
      <Smartphone size={14} strokeWidth={ICON_STROKE} aria-hidden />Dá pra instalar na tela inicial pelo menu do navegador.
    </p>
  );

  return (
    <div
      className="min-h-[100dvh] w-full bg-page overflow-x-hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        paddingLeft: "max(env(safe-area-inset-left), 16px)",
        paddingRight: "max(env(safe-area-inset-right), 16px)",
      }}
    >
      <div className={`mx-auto flex flex-col ${isDesktop ? "max-w-5xl gap-20" : "max-w-md gap-10"}`}>
        {topo}
        {isDesktop ? (
          <div className="grid grid-cols-2 gap-12 items-center">{hero}<Demo /></div>
        ) : (
          <>{hero}<Demo /></>
        )}
        {destaques}
        {preco}
        {fim}
        {instalar}
      </div>
      <AnimatePresence>{showAuth && <AuthSheet key="auth" motivo={showAuth === "criar" ? MOTIVOS_CONTA.comecar : null} onClose={() => setShowAuth(false)} />}</AnimatePresence>
    </div>
  );
}
