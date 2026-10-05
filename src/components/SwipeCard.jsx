import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { Check, X, Split } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { SWIPE_THRESHOLD, SWIPE_UP_THRESHOLD } from "../lib/deck.js";

// Casca genérica de card arrastável: física do arrasto, animação de saída e
// os carimbos de cada direção. Fundo de marca sólido; texto em on-brand. O conteúdo vem de `children`, então
// o mesmo card serve pro deck de contas e pro "Revisar gastos".
// labels: { right, left, up } — `up` ausente desliga o swipe pra cima.
export function SwipeCard({ item, onSwipe, isTop, stackIndex, labels, onTap, children }) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], prefersReducedMotion ? [0, 0] : [-18, 18]);
  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const redOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const blueOpacity = useTransform(y, [SWIPE_UP_THRESHOLD, 0], [1, 0]);
  const allowUp = !!labels.up;

  function handleDragEnd(_, info) {
    const { velocity: { x: vx, y: vy }, offset: { x: ox, y: oy } } = info;
    let result = false;
    if (allowUp && (oy < SWIPE_UP_THRESHOLD || vy < -500)) result = onSwipe("up", item, { vx: 0, vy });
    else if (ox > SWIPE_THRESHOLD || vx > 600) result = onSwipe("right", item, { vx, vy: 0 });
    else if (ox < -SWIPE_THRESHOLD || vx < -600) result = onSwipe("left", item, { vx, vy: 0 });
    // onSwipe devolve false quando a decisão depende de um modal (escolher
    // conta, dividir…): o card volta pro centro e só sai quando confirmar.
    if (result === false) {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  }

  // ── Cards da pilha (não-topo) ─────────────────────────────
  if (!isTop) {
    const ts = 1 - stackIndex * 0.04;
    const ty = stackIndex * 12;
    const to = 1 - stackIndex * 0.15;
    return (
      <motion.div
        className="absolute inset-0 mx-auto"
        initial={{ scale: ts, y: ty, opacity: to }}
        animate={{ scale: ts, y: ty, opacity: to }}
        transition={{ type: "spring", stiffness: 280, damping: 26, mass: 0.8 }}
        style={{ zIndex: 10 - stackIndex, width: "100%", originY: 1 }}
      >
        <div className="w-full h-full rounded-lg bg-stack" />
      </motion.div>
    );
  }

  // ── Card do topo ──────────────────────────────────────────
  return (
    <motion.div
      className="absolute inset-0 mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateZ, zIndex: 20, width: "100%" }}
      drag={allowUp ? true : "x"}
      dragConstraints={{ top: -300, bottom: 150, left: -300, right: 300 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      onTap={onTap}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileDrag={{ scale: 0.98 }}
      variants={{
        exit: ({ vx = 0, dir } = {}) => {
          const cx = x.get();
          const cy = y.get();
          if (dir === "up") {
            return {
              y: -700, x: cx * 1.5, rotate: prefersReducedMotion ? 0 : cx * 0.05, opacity: 0,
              transition: { duration: 0.42, ease: [0.4, 0, 1, 1] },
            };
          }
          const sign = dir === "right" ? 1 : -1;
          // rotação extra baseada na velocidade: quanto mais rápido, mais gira
          const velRotate = prefersReducedMotion ? 0 : sign * Math.min(Math.abs(vx) / 160, 20);
          // duração menor para swipes mais rápidos
          const exitDur = Math.max(0.26, 0.38 - Math.min(Math.abs(vx), 1200) / 5000);
          return {
            x: sign * 720,
            y: cy + 80, // arco natural: card cai levemente ao sair
            rotate: velRotate,
            opacity: 0,
            transition: { duration: exitDur, ease: [0.4, 0, 1, 1] },
          };
        },
      }}
      exit="exit"
    >
      <div className="w-full h-full rounded-lg overflow-hidden shadow relative select-none bg-brand text-on-brand">
        {children}
        <Carimbo opacity={greenOpacity} bg="rgb(var(--pos) / 0.92)" Icon={Check} label={labels.right} />
        <Carimbo opacity={redOpacity} bg="rgb(var(--neg) / 0.92)" Icon={X} label={labels.left} />
        {allowUp && <Carimbo opacity={blueOpacity} bg="rgb(17 19 24 / 0.92)" Icon={Split} label={labels.up} />}
      </div>
    </motion.div>
  );
}

function Carimbo({ opacity, bg, Icon, label }) {
  return (
    <motion.div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 pointer-events-none text-on-brand" style={{ backgroundColor: bg, opacity }}>
      <Icon size={40} strokeWidth={ICON_STROKE} aria-hidden />
      <span className="text-xl font-semibold">{label}</span>
    </motion.div>
  );
}
