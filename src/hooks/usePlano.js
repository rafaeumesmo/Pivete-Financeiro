import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { PRO_ATIVO, pode, limiteTexto } from "../lib/plano.js";

// Lê o plano da conta na tabela `assinaturas` (só o dono lê; ver
// supabase/policies/07_assinaturas.sql). Sem linha, sem conta ou com o Pro
// desligado: "gratis" — e com a flag desligada nem consulta o servidor.
export function usePlano(userId) {
  const [plano, setPlano] = useState("gratis");
  useEffect(() => {
    if (!PRO_ATIVO || !supabase || !userId) { setPlano("gratis"); return; }
    let vivo = true;
    supabase.from("assinaturas").select("plano").eq("user_id", userId).maybeSingle()
      .then(({ data }) => { if (vivo) setPlano(data?.plano === "pro" ? "pro" : "gratis"); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [userId]);
  return { plano, logado: !!userId };
}

// Contexto pros pontos de "criar mais" em qualquer tela. tentar(recurso,
// usados?) devolve true se pode criar; se não pode, avisa e devolve false.
// `usados` padrão vem de `contagens` (calculadas no MainApp). Sem provider,
// tudo liberado.
const PlanoContext = createContext({ plano: "gratis", logado: false, tentar: () => true });
export const PlanoProvider = PlanoContext.Provider;
export function usePlanoCtx() { return useContext(PlanoContext); }

export function criarTentar({ plano, logado, contagens = {}, avisar }) {
  return (recurso, usados = contagens[recurso] ?? 0) => {
    const r = pode(recurso, { usados, plano, logado });
    if (!r.ok) avisar?.(limiteTexto(recurso, r.limite));
    return r.ok;
  };
}
