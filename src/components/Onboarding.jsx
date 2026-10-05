import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, Smartphone, Split, X } from "lucide-react";
import { Brand } from "./Brand.jsx";
import { Carimbo } from "./SwipeCard.jsx";
import { CategoryTile } from "./CategoryTile.jsx";
import { btnCls } from "./ui.jsx";
import { ICON_STROKE } from "../lib/icons.js";

const CASA = { id: "casa", nome: "Casa" };

// Miniatura do card do deck (mesmo azul sólido e carimbos do SwipeCard).
// Também usado na demo da Landing (com outro valor/vencimento).
export function OBMiniCard({ cardX, cardY, valor = "R$ 40,00", vence = "Vence hoje" }) {
  const rotateZ = useTransform(cardX, [-180, 180], [-14, 14]);
  const greenOp = useTransform(cardX, [0, 90], [0, 1]);
  const redOp   = useTransform(cardX, [-90, 0], [1, 0]);
  const blueOp  = useTransform(cardY, [-90, 0], [1, 0]);
  return (
    <motion.div className="rounded-lg overflow-hidden shadow relative flex-shrink-0 bg-brand text-on-brand select-none" style={{ x: cardX, y: cardY, rotate: rotateZ, width: 192, height: 256 }}>
      <div className="h-full flex flex-col justify-between p-4">
        <div className="flex items-center gap-2 min-w-0">
          <CategoryTile categoria={CASA} size={28} onBrand />
          <span className="text-[12px] font-medium opacity-80 truncate">Casa</span>
        </div>
        <p className="text-center text-[28px] leading-none font-bold tracking-tight tabular-nums">{valor}</p>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold truncate">Internet</p>
          <p className="text-[12px] opacity-70 mt-0.5 truncate">{vence}</p>
        </div>
      </div>
      <Carimbo opacity={greenOp} cls="bg-pos/[0.92] text-on-pos" Icon={Check} label="Paguei" />
      <Carimbo opacity={redOp} cls="bg-neg/[0.92] text-on-neg" Icon={X} label="Adiar" />
      <Carimbo opacity={blueOp} cls="bg-nav/[0.92] text-on-nav" Icon={Split} label="Dividir" />
    </motion.div>
  );
}

function OBStep1() {
  const prefersReducedMotion = useReducedMotion();
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  useEffect(() => {
    if (prefersReducedMotion) return; // loop decorativo — pula pra quem pediu menos movimento
    let dead = false;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    (async () => {
      while (!dead) {
        await wait(550); if (dead) return;
        await animate(cardX, 152, { duration: 0.42, ease: "easeOut" });
        await wait(620); if (dead) return;
        await animate(cardX, 0, { type: "spring", stiffness: 300, damping: 22 });
        await wait(500); if (dead) return;
        await animate(cardX, -152, { duration: 0.42, ease: "easeOut" });
        await wait(620); if (dead) return;
        await animate(cardX, 0, { type: "spring", stiffness: 300, damping: 22 });
      }
    })();
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- useMotionValue/prefersReducedMotion são estáveis durante o ciclo de vida do componente, roda só no mount
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col items-center gap-5">
      <div className="flex justify-center" style={{ height: 256 }}><OBMiniCard cardX={cardX} cardY={cardY} /></div>
      <div className="text-center">
        <h3 className="text-fg font-semibold text-[17px] mb-2">Pagou ou vai deixar pra depois?</h3>
        <p className="text-fg-2 text-sm leading-relaxed">
          Cada card é uma conta vencendo nos próximos 7 dias. Pagou? Arraste pra <span className="text-pos font-medium">direita</span> e o valor sai do saldo.
          Não rola agora? Pra <span className="text-neg font-medium">esquerda</span>, que ela volta depois.
        </p>
      </div>
    </motion.div>
  );
}

function OBStep2() {
  const prefersReducedMotion = useReducedMotion();
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  useEffect(() => {
    if (prefersReducedMotion) return; // loop decorativo — pula pra quem pediu menos movimento
    let dead = false;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    (async () => {
      while (!dead) {
        await wait(500); if (dead) return;
        await animate(cardY, -152, { duration: 0.42, ease: "easeOut" });
        await wait(650); if (dead) return;
        await animate(cardY, 0, { type: "spring", stiffness: 280, damping: 22 });
      }
    })();
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- useMotionValue é estável durante o ciclo de vida do componente, roda só no mount
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col items-center gap-5">
      <div className="flex justify-center" style={{ height: 256 }}><OBMiniCard cardX={cardX} cardY={cardY} /></div>
      <div className="text-center">
        <h3 className="text-fg font-semibold text-[17px] mb-2">Rachou com a galera? Pra cima</h3>
        <p className="text-fg-2 text-sm leading-relaxed">
          Arraste pra <span className="text-brand-ink font-medium">cima</span>, escolha entre quantas pessoas dividir e mande o link da cobrança. Cada um avisa quando pagar.
        </p>
      </div>
    </motion.div>
  );
}

function OBStep3({ onBack, onFinish }) {
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
      <div className="text-center pt-1">
        <span className="mx-auto mb-3 w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center" aria-hidden><Smartphone size={24} strokeWidth={ICON_STROKE} /></span>
        <h3 className="text-fg font-semibold text-[17px] mb-1.5">Sem cadastro, de boa</h3>
        <p className="text-fg-2 text-[13px] leading-relaxed">Tudo fica salvo neste aparelho. Quando quiser usar em outro aparelho ou dividir com os amigos, crie uma conta e seus dados vão junto.</p>
      </div>
      <div className="rounded-md bg-tile px-4 py-3">
        <p className="text-[13px] font-semibold text-fg mb-1">Quer ver funcionando antes?</p>
        <p className="text-[12px] text-fg-2 leading-relaxed">Os dados de exemplo trazem renda de R$ 1.700 + R$ 800 e os fixos Passagem R$ 450, Claude R$ 110, Internet R$ 40 e Spotify R$ 20. Dá pra apagar tudo depois no Perfil.</p>
      </div>
      <div className="flex flex-col gap-2">
        <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => onFinish(true)} className={`${btnCls.primary} w-full py-3 text-sm`}>Começar com dados de exemplo</motion.button>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onBack} className={`${btnCls.ghost} px-3 py-3 text-sm`}><ChevronLeft size={16} strokeWidth={ICON_STROKE} aria-hidden />Voltar</motion.button>
          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => onFinish(false)} className={`${btnCls.secondary} flex-1 py-3 text-sm`}>Começar do zero</motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const TOTAL = 3;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4 bg-black/40">
      <motion.div role="dialog" aria-modal="true" aria-label="Como funciona" initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="w-full max-w-sm bg-surface rounded-lg border border-line shadow overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-center justify-between">
          <div><p className="text-[13px] text-fg-2 mb-1">Chegou no</p><h2 className="text-[19px] font-bold text-fg leading-none"><Brand icon /></h2></div>
          <span className="text-[12px] text-fg-3 tabular-nums">{step + 1} / {TOTAL}</span>
        </div>
        {/* Content */}
        <div className="px-6 pt-5 pb-4" style={{ minHeight: 348 }}>
          <AnimatePresence mode="wait">
            {step === 0 && <OBStep1 key="ob0" />}
            {step === 1 && <OBStep2 key="ob1" />}
            {step === 2 && <OBStep3 key="ob2" onBack={() => setStep(1)} onFinish={onFinish} />}
          </AnimatePresence>
        </div>
        {/* Footer: dots + nav (steps 0-1) or dots only (step 2) */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-brand" : "w-1.5 bg-line"}`} />
            ))}
          </div>
          {step < 2 && (
            <div className="flex gap-2">
              {step > 0 && <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => setStep(s => s - 1)} className={`${btnCls.ghost} px-4 py-2 text-sm`}>Voltar</motion.button>}
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={() => setStep(s => s + 1)} className={`${btnCls.primary} px-5 py-2 text-sm`}>Próximo</motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
