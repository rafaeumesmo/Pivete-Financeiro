import { supabase } from "../supabaseClient";
import { getAnonId } from "./anon";

/*
 * Camada de dados das enquetes "Bora?". Funções puras (sem React) usadas tanto
 * pela página pública de voto quanto pelo app logado.
 */

// Cria a enquete + opções. options: [{ emoji, label, budget? }] — budget é o
// orçamento por pessoa em centavos (opcional). Retorna o id.
export async function createPoll({ title, type, options, userId = null }) {
  if (!supabase) throw new Error("Supabase não configurado");
  const clean = options
    .map((o) => ({ emoji: (o.emoji || "").trim() || null, label: (o.label || "").trim(), budget: o.budget > 0 ? o.budget : null }))
    .filter((o) => o.label);
  if (!title.trim()) throw new Error("Dê um título à enquete");
  if (clean.length < 2) throw new Error("Adicione ao menos 2 opções");

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      title: title.trim(),
      type: type === "multiple" ? "multiple" : "single",
      creator_anon_id: getAnonId(),
      creator_user_id: userId,
    })
    .select()
    .single();
  if (error) {
    if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.code === "NETWORK_ERROR") {
      throw new Error("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
    }
    if (error.code === "42P01") {
      throw new Error("Tabela 'polls' não encontrada. Execute o SQL do Bora no Supabase antes de usar esta função.");
    }
    if (error.code === "42501" || error.message?.includes("row-level security")) {
      throw new Error("Permissão negada. Verifique as políticas RLS das tabelas polls/poll_options/poll_votes.");
    }
    throw error;
  }

  // budget_cents só vai no insert se alguma opção tiver orçamento — assim o
  // Bora continua funcionando em bancos sem a coluna (03_bora_budget.sql).
  const comOrcamento = clean.some((o) => o.budget);
  const rows = clean.map((o, i) => ({ poll_id: poll.id, emoji: o.emoji, label: o.label, position: i, ...(comOrcamento ? { budget_cents: o.budget } : {}) }));
  const { error: optErr } = await supabase.from("poll_options").insert(rows);
  if (optErr) {
    if (comOrcamento && (optErr.code === "PGRST204" || optErr.message?.includes("budget_cents"))) {
      throw new Error("O orçamento por pessoa precisa da coluna budget_cents: aplique supabase/policies/03_bora_budget.sql no Supabase.");
    }
    throw optErr;
  }

  return poll.id;
}

// Lista as enquetes do usuário (por anon_id local e/ou conta logada) com
// contagem de votos. Usado em "Minhas enquetes".
export async function fetchMyPolls(userId = null) {
  if (!supabase) return [];
  const anonId = getAnonId();
  const ors = [`creator_anon_id.eq.${anonId}`];
  if (userId) ors.push(`creator_user_id.eq.${userId}`);
  const { data, error } = await supabase
    .from("polls")
    .select("*, poll_options(id), poll_votes(voter_anon_id)")
    .or(ors.join(","))
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data || []).map((p) => ({
    ...p,
    optionCount: p.poll_options?.length || 0,
    voterCount: new Set((p.poll_votes || []).map((v) => v.voter_anon_id)).size,
  }));
}

// Apaga a enquete (com opções e votos) se eu sou o criador — via RPC
// delete_poll (supabase/policies/05_polls_delete.sql).
export async function deletePoll(pollId) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.rpc("delete_poll", { p_poll_id: pollId, p_anon_id: getAnonId() });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error("Pra apagar enquetes, aplique supabase/policies/05_polls_delete.sql no Supabase.");
    }
    throw error;
  }
  if (!data) throw new Error("Só quem criou a enquete pode apagar.");
}

// Vincula enquetes criadas anonimamente à conta após login.
export async function migrateAnonPolls(userId) {
  if (!supabase || !userId) return;
  await supabase
    .from("polls")
    .update({ creator_user_id: userId })
    .eq("creator_anon_id", getAnonId())
    .is("creator_user_id", null);
}
