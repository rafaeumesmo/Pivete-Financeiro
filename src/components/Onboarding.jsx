import { motion, useTransform } from "framer-motion";
import { Check, Split, X } from "lucide-react";
import { Carimbo } from "./SwipeCard.jsx";
import { CategoryTile } from "./CategoryTile.jsx";

const CASA = { id: "casa", nome: "Casa" };

// Miniatura do card do deck (mesmo azul sólido e carimbos do SwipeCard), na
// demo da Landing. O onboarding de quem cria conta é o OnboardingConta.jsx.
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
