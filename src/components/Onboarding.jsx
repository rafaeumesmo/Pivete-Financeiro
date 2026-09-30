import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence, useReducedMotion } from "framer-motion";
import { Brand } from "./Brand.jsx";

// Também usado na demo da Landing (com outro valor/vencimento).
export function OBMiniCard({ cardX, cardY, valor = "R$ 40,00", vence = "Vence hoje" }) {
  const rotateZ = useTransform(cardX, [-180, 180], [-20, 20]);
  const greenOp = useTransform(cardX, [0, 90], [0, 1]);
  const redOp   = useTransform(cardX, [-90, 0], [1, 0]);
  const blueOp  = useTransform(cardY, [-90, 0], [1, 0]);
  return (
    <motion.div className="rounded-2xl overflow-hidden shadow-2xl relative flex-shrink-0" style={{ x: cardX, y: cardY, rotate: rotateZ, width: 192, height: 256 }}>
      <div className="tema-escuro w-full h-full bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3 z-10"><span className="text-[8px] font-semibold tracking-widest uppercase bg-white/20 text-white/90 px-2 py-0.5 rounded-full border border-white/20">Casa/Contas</span></div>
        <div className="absolute top-3 right-3 z-10 text-2xl">🏠</div>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 text-center"><p className="text-[26px] font-black text-white tabular-nums">{valor}</p></div>
        <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10">
          <p className="text-sm font-bold text-white">Internet</p>
          <p className="text-[10px] text-white/70 mt-1 inline-block bg-black/25 px-2 py-0.5 rounded-full">🗓 {vence}</p>
        </div>
      </div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(22,163,74,0.55)", opacity: greenOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1 -rotate-[20deg]"><span className="text-white font-black text-sm tracking-widest uppercase">Paguei</span></div></motion.div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(220,38,38,0.55)", opacity: redOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1 rotate-[20deg]"><span className="text-white font-black text-sm tracking-widest uppercase">Adiar</span></div></motion.div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(37,99,235,0.6)", opacity: blueOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1"><span className="text-white font-black text-sm tracking-widest uppercase">Dividir ↑</span></div></motion.div>
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
        <h3 className="text-white font-bold text-[17px] mb-2">Paguei ou adiar</h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Cada card é uma conta vencendo nos próximos 7 dias. Arraste para a <span className="text-emerald-400 font-medium">direita</span> quando pagar — sai da sua conta.
          Para a <span className="text-red-400 font-medium">esquerda</span> pra adiar e ver de novo depois.
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
        <h3 className="text-white font-bold text-[17px] mb-2">Dividir a conta</h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Arraste para <span className="text-blue-400 font-medium">cima</span> quando a conta for dividida: você escolhe entre quantas pessoas e manda o link de cobrança.
        </p>
      </div>
    </motion.div>
  );
}

function OBStep3({ onBack, onFinish }) {
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
      <div className="text-center pt-1">
        <div className="text-4xl mb-2">💾</div>
        <h3 className="text-white font-bold text-[17px] mb-1.5">Quer guardar? Entre na conta</h3>
        <p className="text-white/45 text-[13px] leading-relaxed">Sem conta, dá pra usar à vontade, mas nada fica salvo: fechou a aba, some tudo. Com conta, fica guardado e aparece em qualquer aparelho.</p>
      </div>
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-3">
        <p className="text-[12px] font-semibold text-white/80 mb-1">Quer ver funcionando primeiro?</p>
        <p className="text-[11.5px] text-white/40 leading-relaxed">Os dados de exemplo trazem renda de R$ 1.700 + R$ 800 e os fixos Passagem R$ 450, Claude R$ 110, Internet R$ 40 e Spotify R$ 20. Dá pra apagar tudo depois no Perfil.</p>
      </div>
      <div className="flex flex-col gap-2">
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => onFinish(true)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-blue-500 transition">Começar com dados de exemplo</motion.button>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={onBack} className="px-3.5 py-2.5 rounded-xl text-sm text-white/40 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition">← Voltar</motion.button>
          <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => onFinish(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white/70 bg-white/[0.06] border border-white/[0.09] hover:bg-white/[0.1] transition">Começar do zero</motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const TOTAL = 3;
  return (
    <div className="tema-escuro fixed inset-0 z-[60] flex flex-col items-center justify-center px-5 bg-black/60 backdrop-blur-[2px]">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="w-full max-w-sm bg-sheet rounded-3xl border border-white/[0.09] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
          <div><p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">Bem-vindo ao</p><h2 className="text-[20px] font-black text-white leading-none"><Brand icon /></h2></div>
          <span className="text-[11px] text-white/25">{step + 1} / {TOTAL}</span>
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
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-[#2563eb]" : "w-1.5 bg-white/15"}`} />
            ))}
          </div>
          {step < 2 && (
            <div className="flex gap-2">
              {step > 0 && <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-xl text-sm text-white/40 bg-white/[0.05] border border-white/[0.07] hover:bg-white/[0.08] transition">Voltar</motion.button>}
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setStep(s => s + 1)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-blue-500 transition">Próximo</motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
