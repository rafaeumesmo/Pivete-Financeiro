import { useEffect, useState } from "react";

// mobile < 768 ≤ tablet < 1024 ≤ desktop
function atual() {
  const w = window.innerWidth;
  return w >= 1024 ? "desktop" : w >= 768 ? "tablet" : "mobile";
}

export function useBreakpoint() {
  const [bp, setBp] = useState(atual);
  useEffect(() => {
    const h = () => setBp(atual());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}
