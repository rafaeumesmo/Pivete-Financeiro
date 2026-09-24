import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { partesIguais } from "../lib/splits.js";

const PROFILE_COLS = "id,username,display_name,avatar_emoji";

// Traduz erro do PostgREST pra algo acionável (tabela ausente = SQL de
// supabase/policies/01_splits.sql ainda não aplicado).
function explicar(error) {
  if (error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.includes("split_")) {
    return new Error("Divisão de contas ainda não configurada no servidor: aplique supabase/policies/01_splits.sql no Supabase.");
  }
  if (error?.code === "42501" || error?.message?.includes("row-level security")) {
    return new Error("Sem permissão pra essa ação (só amigos aceitos entram em grupos; só quem pagou registra a despesa).");
  }
  return error instanceof Error ? error : new Error(error?.message || "Erro ao falar com o servidor");
}

// Divisão de contas estilo Splitwise (Supabase). Só existe logado. Guarda no
// servidor apenas grupos, despesas divididas e quitações — nada de saldo de
// conta, extrato ou dívidas pessoais.
export function useSplits(userId) {
  const [groups,      setGroups]      = useState([]); // [{ id, name, created_by, members: [profile] }]
  const [expenses,    setExpenses]    = useState([]); // [{ ..., shares: [{ user_id, amount_cents }] }]
  const [settlements, setSettlements] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoading(true);
    try {
      const { data: gs, error: gErr } = await supabase
        .from("split_groups")
        .select(`id, name, created_by, created_at, split_group_members(user_id, profile:profiles!split_group_members_user_id_fkey(${PROFILE_COLS}))`)
        .order("created_at", { ascending: false });
      if (gErr) throw gErr;
      const ids = (gs || []).map(g => g.id);
      const [{ data: es, error: eErr }, { data: ss, error: sErr }] = ids.length
        ? await Promise.all([
            supabase.from("split_expenses").select("id, group_id, paid_by, description, amount_cents, spent_on, created_at, split_shares(user_id, amount_cents)").in("group_id", ids).order("created_at", { ascending: false }).limit(500),
            supabase.from("split_settlements").select("*").in("group_id", ids).order("created_at", { ascending: false }).limit(500),
          ])
        : [{ data: [] }, { data: [] }];
      if (eErr) throw eErr;
      if (sErr) throw sErr;
      setGroups((gs || []).map(g => ({ id: g.id, name: g.name, created_by: g.created_by, members: (g.split_group_members || []).map(m => m.profile).filter(Boolean) })));
      setExpenses((es || []).map(e => ({ ...e, shares: e.split_shares || [] })));
      setSettlements(ss || []);
      setError(null);
    } catch (err) {
      setError(explicar(err).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setGroups([]); setExpenses([]); setSettlements([]); setError(null); return; }
    load();
    if (!supabase) return;
    const channel = supabase
      .channel(`splits-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "split_expenses" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "split_settlements" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "split_group_members" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  async function createGroup(name, memberIds) {
    if (!supabase || !userId) throw new Error("Entre pra dividir contas");
    const { data: g, error: e1 } = await supabase.from("split_groups").insert({ name: name.trim(), created_by: userId }).select().single();
    if (e1) throw explicar(e1);
    const rows = [...new Set([userId, ...memberIds])].map(user_id => ({ group_id: g.id, user_id }));
    const { error: e2 } = await supabase.from("split_group_members").insert(rows);
    if (e2) throw explicar(e2);
    await load();
    return g.id;
  }

  // Despesa paga por MIM, dividida igualmente entre `participantIds`.
  async function addExpense(groupId, { description, amount, participantIds, spentOn }) {
    if (!supabase || !userId) throw new Error("Entre pra dividir contas");
    const { data: e, error: e1 } = await supabase.from("split_expenses")
      .insert({ group_id: groupId, paid_by: userId, description: description.trim(), amount_cents: amount, ...(spentOn ? { spent_on: spentOn } : {}) })
      .select().single();
    if (e1) throw explicar(e1);
    const shares = partesIguais(amount, participantIds).map(s => ({ ...s, expense_id: e.id }));
    const { error: e2 } = await supabase.from("split_shares").insert(shares);
    if (e2) {
      await supabase.from("split_expenses").delete().eq("id", e.id); // não deixa despesa sem partes
      throw explicar(e2);
    }
    await load();
    return { expense: e, minhaParte: shares.find(s => s.user_id === userId)?.amount_cents ?? 0 };
  }

  async function deleteExpense(expenseId) {
    if (!supabase) return;
    const { error: e } = await supabase.from("split_expenses").delete().eq("id", expenseId);
    if (e) throw explicar(e);
    await load();
  }

  // from pagou to (fora do app). Um dos dois tem que ser eu (RLS).
  async function settle(groupId, fromUser, toUser, amount) {
    if (!supabase || !userId) throw new Error("Entre pra dividir contas");
    const { error: e } = await supabase.from("split_settlements")
      .insert({ group_id: groupId, from_user: fromUser, to_user: toUser, amount_cents: amount, created_by: userId });
    if (e) throw explicar(e);
    await load();
  }

  return { groups, expenses, settlements, loading, error, reload: load, createGroup, addExpense, deleteExpense, settle };
}
