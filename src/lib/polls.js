import { supabase } from "../supabaseClient";
import { getAnonId } from "./anon";

/*
 * Camada de dados das enquetes "Bora?". Funções puras (sem React) usadas tanto
 * pela página pública de voto quanto pelo app logado.
 */

// Cria a enquete + opções. options: [{ emoji, label }]. Retorna o id.
export async function createPoll({ title, type, options, userId = null }) {
  if (!supabase) throw new Error("Supabase não configurado");
  const clean = options
    .map((o) => ({ emoji: (o.emoji || "").trim() || null, label: (o.label || "").trim() }))
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

  const rows = clean.map((o, i) => ({ poll_id: poll.id, emoji: o.emoji, label: o.label, position: i }));
  const { error: optErr } = await supabase.from("poll_options").insert(rows);
  if (optErr) throw optErr;

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

// Vincula enquetes criadas anonimamente à conta após login.
export async function migrateAnonPolls(userId) {
  if (!supabase || !userId) return;
  await supabase
    .from("polls")
    .update({ creator_user_id: userId })
    .eq("creator_anon_id", getAnonId())
    .is("creator_user_id", null);
}
