import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence, useReducedMotion } from "framer-motion";
import { ONBOARDING_GRADIENTS } from "../lib/categories.js";

function OBMiniCard({ cardX, cardY }) {
  const rotateZ = useTransform(cardX, [-180, 180], [-20, 20]);
  const greenOp = useTransform(cardX, [0, 90], [0, 1]);
  const redOp   = useTransform(cardX, [-90, 0], [1, 0]);
  const blueOp  = useTransform(cardY, [-90, 0], [1, 0]);
  return (
    <motion.div className="rounded-2xl overflow-hidden shadow-2xl relative flex-shrink-0" style={{ x: cardX, y: cardY, rotate: rotateZ, width: 192, height: 256 }}>
      <div className="w-full h-full bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-600 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3 z-10"><span className="text-[8px] font-semibold tracking-widest uppercase bg-white/20 text-white/90 px-2 py-0.5 rounded-full border border-white/20">Estudos</span></div>
        <div className="absolute top-3 right-3 z-10 text-2xl">📖</div>
        <div className="absolute bottom-0 left-0 right-0 p-3.5 z-10">
          <p className="text-sm font-bold text-white">Estudar IHC</p>
          <p className="text-[11px] text-white/55 mt-0.5 line-clamp-2">Revisar heurísticas de Nielsen.</p>
        </div>
      </div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(22,163,74,0.55)", opacity: greenOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1 -rotate-[20deg]"><span className="text-white font-black text-sm tracking-widest uppercase">Feito!</span></div></motion.div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(220,38,38,0.55)", opacity: redOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1 rotate-[20deg]"><span className="text-white font-black text-sm tracking-widest uppercase">Fazer</span></div></motion.div>
      <motion.div className="absolute inset-0 rounded-2xl flex items-center justify-center z-20 pointer-events-none" style={{ background: "rgba(37,99,235,0.6)", opacity: blueOp }}><div className="border-2 border-white/90 rounded-lg px-3 py-1"><span className="text-white font-black text-sm tracking-widest uppercase">Delegar ↑</span></div></motion.div>
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
        <h3 className="text-white font-bold text-[17px] mb-2">Feito ou fazer depois</h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Arraste para a <span className="text-emerald-400 font-medium">direita</span> quando estiver feito.
          Para a <span className="text-red-400 font-medium">esquerda</span> pra deixar pra fazer depois.
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
        <h3 className="text-white font-bold text-[17px] mb-2">Delegar tarefas</h3>
        <p className="text-white/45 text-sm leading-relaxed">
          Arraste para <span className="text-blue-400 font-medium">cima</span> para delegar. Um link de convite é gerado para você compartilhar com quem quiser.
        </p>
      </div>
    </motion.div>
  );
}

function OBStep3({ onBack, onFinish }) {
  const [data, setData] = useState({ title: "", description: "", category: "Alimentação", emoji: "✨" });
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3.5">
      <div><h3 className="text-white font-bold text-[17px] mb-1">Crie sua primeira tarefa</h3><p className="text-white/40 text-sm">Adicione algo que precisa decidir hoje.</p></div>
      <input ref={titleRef} value={data.title} onChange={e => setData(p => ({ ...p, title: e.target.value }))} placeholder="Título da tarefa..." className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition" />
      <textarea value={data.description} onChange={e => setData(p => ({ ...p, description: e.target.value }))} placeholder="Descrição (opcional)..." rows={2} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 resize-none transition" />
      <div className="grid grid-cols-2 gap-2">
        <select value={data.category} onChange={e => setData(p => ({ ...p, category: e.target.value }))} className="rounded-xl border border-white/[0.08] bg-[#18191f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#2563eb]/60">
          {Object.keys(ONBOARDING_GRADIENTS).map(c => (<option key={c} value={c} className="bg-[#18191f]">{c}</option>))}
        </select>
        <input value={data.emoji} onChange={e => setData(p => ({ ...p, emoji: e.target.value }))} placeholder="Emoji" className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition text-center" />
      </div>
      <div className="flex gap-2 pt-1">
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={onBack} className="px-3.5 py-2.5 rounded-xl text-sm text-white/40 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition">← Voltar</motion.button>
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => onFinish(null)} className="flex-1 py-2.5 rounded-xl text-sm text-white/40 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] transition">Pular</motion.button>
        <motion.button whileTap={{ scale: 0.96 }} type="button" onClick={() => onFinish(data.title.trim() ? data : null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-blue-500 transition">
          {data.title.trim() ? "Criar →" : "Entrar →"}
        </motion.button>
      </div>
    </motion.div>
  );
}

export function Onboarding({ onFinish, onCreateTask }) {
  const [step, setStep] = useState(0);
  const TOTAL = 3;
  function complete(taskData) { if (taskData?.title?.trim()) onCreateTask(taskData); onFinish(); }
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-5 bg-black/60 backdrop-blur-[2px]">
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/[0.09] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
          <div><p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">Bem-vindo ao</p><h2 className="text-[20px] font-black text-white leading-none">Task<span style={{ color: "#2563eb" }}>Match</span></h2></div>
          <span className="text-[11px] text-white/25">{step + 1} / {TOTAL}</span>
        </div>
        {/* Content */}
        <div className="px-6 pt-5 pb-4" style={{ minHeight: 348 }}>
          <AnimatePresence mode="wait">
            {step === 0 && <OBStep1 key="ob0" />}
            {step === 1 && <OBStep2 key="ob1" />}
            {step === 2 && <OBStep3 key="ob2" onBack={() => setStep(1)} onFinish={complete} />}
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
