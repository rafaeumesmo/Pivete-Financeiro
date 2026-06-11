import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { normalizeUsername } from "../lib/username";

function loadSeenStories() {
  try { return JSON.parse(localStorage.getItem("tm_stories_seen") || "{}"); } catch { return {}; }
}

export function useSocial(userId) {
  const [friends,         setFriends]         = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [feed,            setFeed]            = useState([]);
  const [sentTasks,       setSentTasks]       = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [friendsLoading,  setFriendsLoading]  = useState(false);
  const seenRef = useRef(loadSeenStories());

  // ── seen tracking ─────────────────────────────────────────
  function markSeen(taskId) {
    seenRef.current[taskId] = true;
    try { localStorage.setItem("tm_stories_seen", JSON.stringify(seenRef.current)); } catch {}
  }
  function isSeen(taskId) { return !!seenRef.current[taskId]; }

  // ── load friends ──────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from("friendships")
      .select("*, friend:profiles!friendships_friend_id_fkey(id,username,display_name,avatar_emoji)")
      .eq("user_id", userId)
      .eq("status", "accepted");
    if (error) { console.error(error); return; }
    setFriends((data || []).map(f => ({
      friendshipId: f.id,
      isCloseFriend: f.is_close_friend,
      profile: f.friend,
    })));
  }, [userId]);

  // ── load pending requests ─────────────────────────────────
  const loadPending = useCallback(async () => {
    if (!supabase || !userId) return;
    const [{ data: inc }, { data: out }] = await Promise.all([
      supabase
        .from("friendships")
        .select("*, requester:profiles!friendships_user_id_fkey(id,username,display_name,avatar_emoji)")
        .eq("friend_id", userId)
        .eq("status", "pending"),
      supabase
        .from("friendships")
        .select("*, target:profiles!friendships_friend_id_fkey(id,username,display_name,avatar_emoji)")
        .eq("user_id", userId)
        .eq("status", "pending"),
    ]);
    setPendingIncoming((inc || []).map(f => ({ friendshipId: f.id, profile: f.requester })));
    setPendingOutgoing((out || []).map(f => ({ friendshipId: f.id, profile: f.target })));
  }, [userId]);

  // ── load feed ─────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_tasks")
      .select(`
        *,
        author:profiles!shared_tasks_author_id_fkey(id,username,display_name,avatar_emoji),
        task_responses(
          id, responder_id, response, created_at,
          responder:profiles!task_responses_responder_id_fkey(id,username,avatar_emoji)
        )
      `)
      .neq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    setLoading(false);
    if (error) { console.error(error); return; }
    setFeed((data || []).map(t => ({
      ...t,
      myResponse: t.task_responses?.find(r => r.responder_id === userId)?.response ?? null,
      responses: t.task_responses || [],
    })));
  }, [userId]);

  // ── load my sent tasks (broadcasts) + responses ───────────
  // O autor consegue ler suas próprias shared_tasks e as respostas
  // (policy task_responses_author_read). Usado na aba "Convites enviados".
  const loadSentTasks = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from("shared_tasks")
      .select(`
        *,
        task_responses(
          id, responder_id, response, created_at,
          responder:profiles!task_responses_responder_id_fkey(id,username,display_name,avatar_emoji)
        )
      `)
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) { console.error(error); return; }
    setSentTasks((data || []).map(t => ({ ...t, responses: t.task_responses || [] })));
  }, [userId]);

  // ── initial load + realtime ───────────────────────────────
  useEffect(() => {
    if (!userId) {
      setFriends([]); setPendingIncoming([]); setPendingOutgoing([]); setFeed([]); setSentTasks([]);
      setFriendsLoading(false);
      return;
    }
    setFriendsLoading(true);
    Promise.all([loadFriends(), loadPending()]).finally(() => setFriendsLoading(false));
    loadFeed();
    loadSentTasks();

    if (!supabase) return;

    const channel = supabase
      .channel(`social-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => {
        loadFriends(); loadPending();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shared_tasks" }, () => {
        loadFeed(); loadSentTasks();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_responses" }, () => {
        loadFeed(); loadSentTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadFriends, loadPending, loadFeed, loadSentTasks]);

  // ── compute stories ───────────────────────────────────────
  const stories = (() => {
    const byAuthor = {};
    for (const task of feed) {
      if (!byAuthor[task.author_id]) {
        byAuthor[task.author_id] = {
          author: task.author,
          tasks: [],
          hasUnread: false,
          isCloseFriend: friends.some(f => f.profile?.id === task.author_id && f.isCloseFriend),
        };
      }
      byAuthor[task.author_id].tasks.push(task);
      if (!task.myResponse && !isSeen(task.id)) byAuthor[task.author_id].hasUnread = true;
    }
    const list = Object.values(byAuthor);
    list.sort((a, b) => (b.hasUnread ? 1 : 0) - (a.hasUnread ? 1 : 0));
    return list;
  })();

  // ── actions ───────────────────────────────────────────────
  async function sendFriendRequest(username) {
    if (!supabase || !userId) throw new Error("Não autenticado");
    const uname = normalizeUsername(username);
    if (!uname) throw new Error("Informe um @username");
    const { data: target } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_emoji")
      .eq("username", uname)        // username é único: no máximo 1 resultado
      .maybeSingle();
    if (!target) throw new Error("Usuário não encontrado");
    if (target.id === userId) throw new Error("Você não pode se adicionar");

    if (friends.some(f => f.profile?.id === target.id)) throw new Error("Vocês já são amigos");
    if (pendingOutgoing.some(p => p.profile?.id === target.id)) throw new Error("Pedido já enviado");
    if (pendingIncoming.some(p => p.profile?.id === target.id)) throw new Error("Essa pessoa já te enviou um pedido — aceite acima");

    const { error } = await supabase
      .from("friendships")
      .insert({ user_id: userId, friend_id: target.id, status: "pending" });
    if (error) throw new Error(error.code === "23505" ? "Pedido já enviado" : error.message);

    await loadPending();
    return target;
  }

  // Desfaz a amizade nos dois lados (modelo de duas linhas). O RLS de DELETE
  // permite remover qualquer linha em que eu seja user_id OU friend_id.
  async function removeFriend(friendId) {
    if (!supabase || !userId) throw new Error("Não autenticado");
    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
    if (error) throw error;
    // Atualização otimista da UI; o realtime confirma em seguida.
    setFriends(prev => prev.filter(f => f.profile?.id !== friendId));
    await loadFriends(); await loadPending();
  }

  async function acceptFriend(friendshipId) {
    if (!supabase || !userId) return;
    // Buscar linha pendente para saber quem enviou
    const { data: row } = await supabase
      .from("friendships")
      .select("*")
      .eq("id", friendshipId)
      .single();
    if (!row) return;

    // Atualizar status para accepted
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);

    // Inserir linha reversa (quem aceitou → quem enviou)
    await supabase.from("friendships").upsert({
      user_id: userId,
      friend_id: row.user_id,
      status: "accepted",
    }, { onConflict: "user_id,friend_id" });

    await loadFriends(); await loadPending(); await loadFeed();
  }

  async function rejectFriend(friendshipId) {
    if (!supabase) return;
    await supabase.from("friendships").delete().eq("id", friendshipId);
    await loadPending();
  }

  async function toggleCloseFriend(friendId, isClose) {
    if (!supabase || !userId) return;
    await supabase
      .from("friendships")
      .update({ is_close_friend: isClose })
      .eq("user_id", userId)
      .eq("friend_id", friendId);
    setFriends(prev =>
      prev.map(f => f.profile?.id === friendId ? { ...f, isCloseFriend: isClose } : f)
    );
  }

  async function shareTask(task, audience) {
    if (!supabase || !userId) throw new Error("Não autenticado");
    const { error } = await supabase.from("shared_tasks").insert({
      author_id: userId,
      title: task.title,
      description: task.description || "",
      category: task.category || "",
      emoji: task.emoji || "✨",
      gradient: task.gradient || "",
      image_url: task.image || task.image_url || null,
      audience,
    });
    if (error) throw error;
  }

  // Envio em massa: cria uma shared_task com a audiência escolhida
  // (close = só favoritos via RLS; friends = todos os amigos). Retorna a linha
  // criada pra que a UI possa rastrear as respostas em "Convites enviados".
  async function massShare(task, audience) {
    if (!supabase || !userId) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("shared_tasks")
      .insert({
        author_id: userId,
        title: task.title,
        description: task.description || "",
        category: task.category || "",
        emoji: task.emoji || "✨",
        gradient: task.gradient || "",
        image_url: task.image || task.image_url || null,
        audience,
      })
      .select()
      .single();
    if (error) throw error;
    await loadSentTasks();
    return data;
  }

  async function respondToTask(sharedTaskId, response) {
    if (!supabase || !userId) return;
    await supabase.from("task_responses").upsert(
      { shared_task_id: sharedTaskId, responder_id: userId, response },
      { onConflict: "shared_task_id,responder_id" }
    );
    setFeed(prev => prev.map(t =>
      t.id === sharedTaskId ? { ...t, myResponse: response } : t
    ));
    markSeen(sharedTaskId);
  }

  async function searchUsers(query) {
    if (!supabase) return [];
    // Aceita com ou sem @; username é salvo em lowercase, então a busca é
    // case-insensitive por construção.
    const q = normalizeUsername(query);
    if (!q) return [];
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_emoji")
      .ilike("username", `%${q}%`)
      .neq("id", userId)
      .limit(10);
    return data || [];
  }

  return {
    friends,
    pendingIncoming,
    pendingOutgoing,
    feed,
    sentTasks,
    stories,
    loading,
    friendsLoading,
    markSeen,
    isSeen,
    loadFeed,
    loadSentTasks,
    sendFriendRequest,
    acceptFriend,
    rejectFriend,
    removeFriend,
    toggleCloseFriend,
    shareTask,
    massShare,
    respondToTask,
    searchUsers,
  };
}
