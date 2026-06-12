import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { getAnonId } from "../lib/anon";

/*
 * Carrega uma enquete (poll + opções + votos), assina realtime nos votos e no
 * status, e expõe as ações de votar / encerrar. Funciona sem login.
 */
export function usePoll(pollId) {
  const [poll,    setPoll]    = useState(null);
  const [options, setOptions] = useState([]);
  const [votes,   setVotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const anonId = useRef(getAnonId());

  const load = useCallback(async () => {
    if (!supabase || !pollId) { setError("config"); setLoading(false); return; }
    const { data, error: err } = await supabase
      .from("polls")
      .select("*, poll_options(*), poll_votes(*)")
      .eq("id", pollId)
      .maybeSingle();
    if (err)  { setError("load"); setLoading(false); return; }
    if (!data) { setError("notfound"); setLoading(false); return; }
    setPoll({ id: data.id, title: data.title, type: data.type, status: data.status, creator_anon_id: data.creator_anon_id, created_at: data.created_at });
    setOptions((data.poll_options || []).slice().sort((a, b) => a.position - b.position));
    setVotes(data.poll_votes || []);
    setError(null);
    setLoading(false);
  }, [pollId]);

  // Recarrega só os votos (leve, usado no realtime).
  const reloadVotes = useCallback(async () => {
    if (!supabase || !pollId) return;
    const { data } = await supabase.from("poll_votes").select("*").eq("poll_id", pollId);
    setVotes(data || []);
  }, [pollId]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!supabase || !pollId) return;
    const channel = supabase
      .channel(`poll-${pollId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` }, reloadVotes)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "polls", filter: `id=eq.${pollId}` }, (payload) => {
        setPoll((p) => (p ? { ...p, status: payload.new.status } : p));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pollId, load, reloadVotes]);

  const myVotes = votes.filter((v) => v.voter_anon_id === anonId.current);
  const isCreator = poll?.creator_anon_id === anonId.current;

  // Confirma os votos do usuário. single: substitui o voto anterior.
  // multiple: reconcilia o conjunto escolhido com o que já existia (add/remove).
  // Lê myVotes uma vez (snapshot) — seguro porque é um único commit.
  async function submitVotes(optionIds, nick) {
    if (!supabase || !poll || poll.status !== "open") return;
    const aid = anonId.current;
    const ids = (optionIds || []).filter(Boolean);
    if (poll.type === "single") {
      await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("voter_anon_id", aid);
      if (ids[0]) {
        const { error: e } = await supabase.from("poll_votes").insert({ poll_id: poll.id, option_id: ids[0], voter_nick: nick, voter_anon_id: aid });
        if (e && e.code !== "23505") throw e;
      }
    } else {
      const want = new Set(ids);
      const have = new Set(myVotes.map((v) => v.option_id));
      const toRemove = myVotes.filter((v) => !want.has(v.option_id));
      if (toRemove.length) await supabase.from("poll_votes").delete().in("id", toRemove.map((v) => v.id));
      const toAdd = ids.filter((id) => !have.has(id));
      if (toAdd.length) {
        const rows = toAdd.map((id) => ({ poll_id: poll.id, option_id: id, voter_nick: nick, voter_anon_id: aid }));
        const { error: e } = await supabase.from("poll_votes").insert(rows);
        if (e && e.code !== "23505") throw e;
      }
    }
    await reloadVotes();
  }

  async function closePoll() {
    if (!supabase || !poll) return;
    await supabase.from("polls").update({ status: "closed" }).eq("id", poll.id);
    setPoll((p) => ({ ...p, status: "closed" }));
  }

  // Tabulação por opção.
  const totalVoters = new Set(votes.map((v) => v.voter_anon_id)).size;
  const tally = options.map((opt) => {
    const optVotes = votes.filter((v) => v.option_id === opt.id);
    return { ...opt, count: optVotes.length, voters: optVotes.map((v) => v.voter_nick) };
  });
  const maxCount = Math.max(0, ...tally.map((t) => t.count));

  return {
    poll, options, votes, loading, error,
    myVotes, isCreator, totalVoters, tally, maxCount,
    submitVotes, closePoll, reload: load,
  };
}
