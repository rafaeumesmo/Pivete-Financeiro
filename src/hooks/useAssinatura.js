import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { assinaturaAtiva, assinanteEmCache, lembrarAssinante } from "../lib/assinatura.js";

const RELER_MS = 60_000; // ao voltar pra aba (pagou/cancelou em outro aparelho)

// Estado da assinatura de quem está logado. A linha da tabela assinaturas só é
// gravada pelas Edge Functions; aqui o app lê e pede as ações.
// ativa: enquanto não leu (ou sem rede), vale o último estado conhecido.
export function useAssinatura(userId) {
  const [row, setRow] = useState(undefined); // undefined = ainda não leu; null = nunca assinou
  const [falhou, setFalhou] = useState(false);
  const lidoEm = useRef(0);

  const ler = useCallback(async () => {
    if (!supabase || !userId) return;
    lidoEm.current = Date.now();
    const { data, error } = await supabase.from("assinaturas").select("*").eq("user_id", userId).maybeSingle();
    if (error) { console.warn("[assinatura] falha ao ler:", error.message); setFalhou(true); return; }
    setFalhou(false);
    setRow(data ?? null);
  }, [userId]);

  useEffect(() => {
    setRow(undefined);
    setFalhou(false);
    if (!userId) return;
    ler();
    const onVis = () => { if (document.visibilityState === "visible" && Date.now() - lidoEm.current > RELER_MS) ler(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [userId, ler]);

  const conhecido = row !== undefined && !falhou;
  const ativa = !!userId && (conhecido ? assinaturaAtiva(row) : assinanteEmCache(userId));

  useEffect(() => {
    if (userId && conhecido) lembrarAssinante(ativa ? userId : null);
  }, [userId, conhecido, ativa]);

  // Chama a Edge Function "assinatura". Lança Error com mensagem pronta pra tela.
  const acao = useCallback(async (nome, extra = {}) => {
    if (!supabase) throw new Error("Pagamento indisponível no momento.");
    const { data, error } = await supabase.functions.invoke("assinatura", { body: { acao: nome, ...extra } });
    if (error) {
      const corpo = await error.context?.json?.().catch(() => null);
      throw new Error(corpo?.erro || "Não foi possível falar com o servidor. Tente de novo.");
    }
    setFalhou(false);
    setRow(data?.assinatura ?? null);
    return data?.assinatura ?? null;
  }, []);

  return {
    assinatura: row ?? null,
    ativa,
    carregando: !!userId && row === undefined && !falhou,
    assinar: (cardTokenId) => acao("assinar", { card_token_id: cardTokenId }),
    cancelar: () => acao("cancelar"),
    recarregar: ler,
  };
}
