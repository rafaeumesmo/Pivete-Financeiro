import { useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

// Publica o lado público do perfil (nível, ofensiva, conquistas) em
// profile_stats, que só amigos aceitos conseguem ler (06_profile_stats.sql).
// Nada em R$ sai daqui. Debounce pra não gravar a cada swipe.
const DELAY_MS = 2000;

export function usePublishProfileStats(userId, { nivel, ofensiva, conquistas }) {
  const lastSent = useRef(null);
  const ids = Object.keys(conquistas || {}).sort();
  const payload = JSON.stringify({ nivel, ofensiva, conquistas: ids });

  useEffect(() => {
    if (!supabase || !userId || payload === lastSent.current) return;
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("profile_stats")
        .upsert({ user_id: userId, ...JSON.parse(payload), updated_at: new Date().toISOString() });
      // Sem a tabela (SQL ainda não aplicado) só avisa no console — o app segue.
      if (error) console.warn("profile_stats:", error.message);
      else lastSent.current = payload;
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [userId, payload]);
}
