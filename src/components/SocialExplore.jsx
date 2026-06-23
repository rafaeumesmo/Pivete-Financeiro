import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMyPolls } from "../lib/polls";

/*
 * SocialExplore — central social completa (aba Explorar).
 * Renderiza o MESMO conteúdo nos dois layouts; só o container muda:
 *   - mobile  (< 1024px): coluna única, largura toda, scroll vertical
 *   - desktop (≥ 1024px): container centralizado max-w-[720px], cards proporcionais
 * A safe area do iPhone é tratada pela bottom nav (sibling), então aqui basta
 * um padding inferior generoso pra nada ficar colado.
 */

const FAV_GREEN = "#34d399";

function Avatar({ emoji, close, size = "md" }) {
  const dim = size === "lg" ? "w-11 h-11 text-2xl" : size === "sm" ? "w-7 h-7 text-sm" : "w-10 h-10 text-xl";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 border-2`}
      style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(37,99,235,0.25))",
        borderColor: close ? FAV_GREEN : "rgba(255,255,255,0.1)",
      }}
    >
      {emoji || "👤"}
    </div>
  );
}

function StarButton({ active, onClick, disabled, big = false }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      disabled={disabled}
      title={active ? "Remover dos favoritos" : "Marcar como favorito"}
      className={`${big ? "w-10 h-10" : "w-9 h-9"} rounded-xl flex items-center justify-center transition flex-shrink-0 disabled:opacity-40 ${
        active
          ? "bg-emerald-500/20 border border-emerald-500/40"
          : "bg-white/[0.05] border border-white/[0.08] hover:border-emerald-500/30"
      }`}
      style={{ color: active ? FAV_GREEN : "rgba(255,255,255,0.3)" }}
    >
      {active ? "⭐" : "☆"}
    </motion.button>
  );
}

function RemoveButton({ onClick, disabled }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      disabled={disabled}
      title="Desfazer amizade"
      className="w-9 h-9 rounded-xl flex items-center justify-center transition flex-shrink-0 bg-white/[0.05] border border-white/[0.08] text-white/30 hover:text-red-400 hover:border-red-500/30 disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
    </motion.button>
  );
}

// ── Sub-aba AMIGOS ───────────────────────────────────────────────
function FriendsPanel({ social, showToast, isDesktop }) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentTo,    setSentTo]    = useState(new Set());
  const [busy,      setBusy]      = useState(new Set()); // ids com ação em andamento

  const { friends, pendingIncoming } = social;
  const favorites = friends.filter(f => f.isCloseFriend);
  const others    = friends.filter(f => !f.isCloseFriend);

  const markBusy   = (id) => setBusy(prev => new Set(prev).add(id));
  const clearBusy  = (id) => setBusy(prev => { const n = new Set(prev); n.delete(id); return n; });
  async function run(id, fn, errMsg) {
    markBusy(id);
    try { await fn(); }
    catch (err) { showToast(err?.message || errMsg, "bg-red-600/90"); }
    finally { clearBusy(id); }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const data = await social.searchUsers(query);
      const friendIds = new Set(friends.map(f => f.profile?.id));
      setResults(data.filter(u => !friendIds.has(u.id)));
    } catch {
      showToast("Erro ao buscar usuários.", "bg-red-600/90");
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(profile) {
    try {
      await social.sendFriendRequest(profile.username);
      setSentTo(prev => new Set([...prev, profile.id]));
      showToast(`Pedido enviado para @${profile.username}!`, "bg-[#2563eb]/90");
    } catch (err) {
      showToast(err.message || "Erro ao enviar pedido.", "bg-red-600/90");
    }
  }

  function handleToggleClose(friendId, current) {
    run(friendId, async () => {
      await social.toggleCloseFriend(friendId, !current);
      showToast(!current ? "Adicionado aos favoritos ⭐" : "Removido dos favoritos", "bg-white/10");
    }, "Não foi possível atualizar o favorito.");
  }

  function handleRemove(profile) {
    if (!window.confirm(`Remover @${profile.username} dos amigos?`)) return;
    run(profile.id, async () => {
      await social.removeFriend(profile.id);
      showToast(`@${profile.username} removido dos amigos.`, "bg-white/10");
    }, "Não foi possível remover a amizade.");
  }

  const grid = isDesktop ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2";

  return (
    <div className="flex flex-col gap-6">
      {/* Busca */}
      <div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value.trim()) setResults([]); }}
            placeholder="Buscar amigo por @username..."
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="px-4 py-2.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[#3b82f6] text-sm font-medium hover:bg-[#2563eb]/30 transition disabled:opacity-40 flex items-center gap-1.5"
          >
            {searching
              ? <span className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin" />
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>}
            Buscar
          </button>
        </form>
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
                {results.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
                    <Avatar emoji={u.avatar_emoji} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">@{u.username}</p>
                      {u.display_name && u.display_name !== u.username && <p className="text-[11px] text-white/40 truncate">{u.display_name}</p>}
                    </div>
                    {sentTo.has(u.id)
                      ? <span className="text-[11px] text-white/30 bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 rounded-full">Enviado</span>
                      : <motion.button whileTap={{ scale: 0.94 }} onClick={() => handleSendRequest(u)} className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-white bg-[#2563eb] hover:bg-blue-500 transition flex-shrink-0">+ Adicionar</motion.button>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pedidos recebidos */}
      {pendingIncoming.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-3 flex items-center gap-2">
            Pedidos recebidos
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingIncoming.length}</span>
          </h3>
          <div className={grid}>
            {pendingIncoming.map(({ friendshipId, profile }) => (
              <div key={friendshipId} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3">
                <Avatar emoji={profile?.avatar_emoji} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">@{profile?.username}</p>
                  {profile?.display_name && <p className="text-[11px] text-white/40 truncate">{profile.display_name}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <motion.button whileTap={{ scale: 0.9 }} disabled={busy.has(friendshipId)} onClick={() => run(friendshipId, () => social.rejectFriend(friendshipId), "Não foi possível recusar.")} className="w-8 h-8 rounded-xl bg-red-400/15 border border-red-400/25 flex items-center justify-center hover:bg-red-400/25 transition disabled:opacity-40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} disabled={busy.has(friendshipId)} onClick={() => run(friendshipId, async () => { await social.acceptFriend(friendshipId); showToast("Amizade aceita! 🎉", "bg-emerald-600/90"); }, "Não foi possível aceitar.")} className="w-8 h-8 rounded-xl bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center hover:bg-emerald-400/25 transition disabled:opacity-40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favoritos em destaque */}
      <div>
        <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-3 flex items-center gap-2" style={{ color: FAV_GREEN }}>
          ⭐ Favoritos <span className="text-white/20 normal-case font-normal tracking-normal">({favorites.length})</span>
        </h3>
        {favorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-5 text-center" style={{ borderColor: "rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.04)" }}>
            <p className="text-[13px] text-white/40">Nenhum favorito ainda</p>
            <p className="text-[11px] text-white/25 mt-1">Toque na ⭐ de um amigo para destacá-lo e poder enviar tasks em massa só pra eles.</p>
          </div>
        ) : (
          <div className={grid}>
            {favorites.map(({ friendshipId, profile }) => (
              <div key={friendshipId} className="flex items-center gap-2.5 rounded-2xl px-4 py-3 border" style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.08)" }}>
                <Avatar emoji={profile?.avatar_emoji} close />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.display_name || profile?.username}</p>
                  <p className="text-[11px] truncate" style={{ color: "rgba(52,211,153,0.8)" }}>@{profile?.username}</p>
                </div>
                <StarButton active disabled={busy.has(profile.id)} onClick={() => handleToggleClose(profile.id, true)} />
                <RemoveButton disabled={busy.has(profile.id)} onClick={() => handleRemove(profile)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Todos os amigos */}
      <div>
        <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-3">
          Todos os amigos <span className="text-white/20 normal-case font-normal tracking-normal">({friends.length})</span>
        </h3>
        {social.friendsLoading && friends.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
            <p className="text-[12px] text-white/30">Carregando amigos...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
            <div className="text-3xl mb-3">👥</div>
            <p className="text-sm text-white/40">Ainda sem amigos</p>
            <p className="text-[12px] text-white/25 mt-1">Busque por @username acima para adicionar</p>
          </div>
        ) : others.length === 0 ? (
          <p className="text-[12px] text-white/25 px-1">Todos os seus amigos são favoritos ⭐</p>
        ) : (
          <div className={grid}>
            {others.map(({ friendshipId, profile }) => (
              <div key={friendshipId} className="flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.06]">
                <Avatar emoji={profile?.avatar_emoji} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.display_name || profile?.username}</p>
                  <p className="text-[11px] text-white/40 truncate">@{profile?.username}</p>
                </div>
                <StarButton active={false} disabled={busy.has(profile.id)} onClick={() => handleToggleClose(profile.id, false)} />
                <RemoveButton disabled={busy.has(profile.id)} onClick={() => handleRemove(profile)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card de envio em massa ───────────────────────────────────────
function MassSendCard({ tasks, social, onMassSend, showToast, isDesktop }) {
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? null);
  const [pickMode,       setPickMode]       = useState(false); // "escolher quem"
  const [picked,         setPicked]         = useState(new Set());
  const [sending,        setSending]        = useState(false);

  const task = tasks.find(t => t.id === selectedTaskId) || tasks[0];
  const favorites = social.friends.filter(f => f.isCloseFriend);

  function togglePick(id) {
    setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function send(audience, recipients) {
    if (!task) { showToast("Crie ou tenha uma task primeiro.", "bg-white/10"); return; }
    if (recipients.length === 0) { showToast("Selecione ao menos um destinatário.", "bg-white/10"); return; }
    setSending(true);
    try {
      await onMassSend(task, audience, recipients);
      showToast(`Task enviada para ${recipients.length} pessoa${recipients.length > 1 ? "s" : ""}! 🚀`, "bg-emerald-600/90");
      setPickMode(false); setPicked(new Set());
    } catch (err) {
      showToast(err.message || "Não foi possível enviar.", "bg-red-600/90");
    } finally {
      setSending(false);
    }
  }

  if (!task) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
        <p className="text-sm text-white/40">Sem tasks pra enviar</p>
        <p className="text-[12px] text-white/25 mt-1">Crie uma task no Início para disparar pra galera.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/[0.08] overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(124,58,237,0.06))" }}>
      <div className="px-5 pt-5 pb-3">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#93c5fd]/70 mb-0.5">Envio em massa</p>
        <h3 className="text-base font-bold text-white">🚀 Enviar task pra galera</h3>
      </div>

      {/* Seletor de task */}
      <div className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {tasks.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTaskId(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border flex-shrink-0 transition ${
                t.id === task.id ? "bg-white/[0.1] border-[#2563eb]/50" : "bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]"
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              <span className="text-[13px] text-white/80 whitespace-nowrap max-w-[140px] truncate">{t.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="px-5 pb-5 flex flex-col gap-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={sending || favorites.length === 0}
          onClick={() => send("close", favorites.map(f => f.profile))}
          className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40"
          style={{ background: "rgba(52,211,153,0.15)", border: `1px solid rgba(52,211,153,0.35)`, color: FAV_GREEN }}
        >
          ⭐ Pros favoritos ({favorites.length})
        </motion.button>
        {favorites.length === 0 && (
          <p className="text-[11px] text-white/25 text-center -mt-1">Marque amigos como favoritos na aba Amigos para liberar.</p>
        )}

        <button
          onClick={() => setPickMode(p => !p)}
          className="w-full py-3 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium text-white/80 hover:bg-white/[0.08] transition flex items-center justify-center gap-2"
        >
          {pickMode ? "Fechar seleção" : "Escolher quem"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 transition-transform ${pickMode ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>

        <AnimatePresence>
          {pickMode && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              {social.friends.length === 0 ? (
                <p className="text-[12px] text-white/30 text-center py-3">Sem amigos para escolher.</p>
              ) : (
                <>
                  <div className={`pt-1 ${isDesktop ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-1.5"}`} style={{ maxHeight: "40vh", overflowY: "auto" }}>
                    {social.friends.map(({ profile, isCloseFriend }) => {
                      const on = picked.has(profile.id);
                      return (
                        <button
                          key={profile.id}
                          onClick={() => togglePick(profile.id)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition text-left ${
                            on ? "bg-[#2563eb]/15 border-[#2563eb]/40" : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]"
                          }`}
                        >
                          <Avatar emoji={profile?.avatar_emoji} close={isCloseFriend} size="sm" />
                          <span className="flex-1 text-[13px] text-white/80 truncate">@{profile?.username}</span>
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${on ? "bg-[#2563eb] border-[#2563eb]" : "border-white/20"}`}>
                            {on && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={sending || picked.size === 0}
                    onClick={() => send("friends", social.friends.filter(f => picked.has(f.profile.id)).map(f => f.profile))}
                    className="w-full mt-2.5 py-3 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {sending ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : `Enviar para ${picked.size} selecionado${picked.size !== 1 ? "s" : ""}`}
                  </motion.button>
                  <p className="text-[10px] text-white/20 mt-2 px-1 leading-relaxed">
                    A task é publicada no feed dos seus amigos; você acompanha as respostas das pessoas escolhidas em Convites enviados.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-aba CONVITES ENVIADOS ────────────────────────────────────
function statusOf(r) {
  // recipients de invites locais usam accepted/declined/pending
  if (r.status === "accepted") return "accepted";
  if (r.status === "declined") return "declined";
  return "pending";
}

function MyPolls({ userId, showToast }) {
  const [polls,   setPolls]   = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchMyPolls(userId).then((p) => { setPolls(p); setLoading(false); });
  }, [userId]);
  useEffect(() => { refresh(); }, [refresh]);

  function pollLink(id) { return `${window.location.origin}${window.location.pathname}#/bora/${id}`; }

  if (loading) {
    return <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" /></div>;
  }
  if (polls.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 text-center">
        <p className="text-[13px] text-white/40">Você ainda não criou enquetes</p>
        <p className="text-[11px] text-white/25 mt-1">Crie uma "Bora?" e mande pra galera decidir junto.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30">Minhas enquetes</h3>
        <button onClick={refresh} className="text-[11px] text-white/30 hover:text-white/60 transition">Atualizar</button>
      </div>
      {polls.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-4 py-3 flex items-center gap-3">
          <span className="text-xl flex-shrink-0">🗳️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{p.title}</p>
            <p className="text-[11px] text-white/35 mt-0.5 flex items-center gap-1.5">
              <span className={p.status === "open" ? "text-emerald-400" : "text-amber-400"}>{p.status === "open" ? "● Aberta" : "○ Encerrada"}</span>
              · {p.voterCount} voto{p.voterCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(pollLink(p.id)); showToast?.("Link copiado!", "bg-emerald-600/90"); }} title="Copiar link" className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
          </button>
          <a href={pollLink(p.id)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-[#2563eb]/15 border border-[#2563eb]/30 text-[12px] font-medium text-[#93c5fd] hover:bg-[#2563eb]/25 transition flex-shrink-0">Resultados</a>
        </div>
      ))}
    </div>
  );
}

function SentInvitesPanel({ invites, addRecipient, updateRecipientStatus, shareInvite, onResendFavorites, favoritesCount, onCreateGroup, onShareTask, isLoggedIn, userId, showToast }) {
  const [expandedId, setExpandedId] = useState(null);
  const [inputValues, setInputValues] = useState({});

  const color = (s) => s === "accepted" ? "text-emerald-400" : s === "declined" ? "text-red-400" : "text-white/30";
  const label = (s) => s === "accepted" ? "Aceitou" : s === "declined" ? "Recusou" : "Aguardando";
  const dot   = (s) => s === "accepted" ? "bg-emerald-400" : s === "declined" ? "bg-red-400" : "bg-white/20";

  return (
    <div className="flex flex-col gap-5">
      <motion.button whileTap={{ scale: 0.97 }} onClick={onCreateGroup} className="w-full py-3 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400 font-semibold text-sm hover:bg-purple-500/25 transition flex items-center justify-center gap-2">
        <span>🗳️</span> Criar enquete (Bora?)
      </motion.button>

      {isLoggedIn && <MyPolls userId={userId} showToast={showToast} />}

      <div className="flex flex-col gap-3">

      {invites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06] p-12 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-xl text-white/20">↑</div>
          <div>
            <p className="text-sm font-medium text-white/40">Nenhum convite enviado ainda</p>
            <p className="text-xs text-white/20 mt-1">Use o card de envio em massa ou arraste um card pra cima para delegar.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {invites.map((invite) => {
            const isExpanded = expandedId === invite.id;
            const recips = invite.recipients || [];
            const accepted = recips.filter(r => statusOf(r) === "accepted").length;
            const declined = recips.filter(r => statusOf(r) === "declined").length;
            const pending  = recips.filter(r => statusOf(r) === "pending").length;

            return (
              <div key={invite.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
                <div className={`h-1 w-full bg-gradient-to-r ${invite.gradient || "from-blue-600 to-purple-700"}`} />
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${invite.gradient || "from-blue-600 to-purple-700"} flex items-center justify-center text-lg flex-shrink-0 shadow-lg`}>
                      {invite.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/30">{invite.category}</span>
                        {invite.audience === "close" && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.15)", color: FAV_GREEN }}>⭐ favoritos</span>}
                      </div>
                      <p className="text-sm font-semibold text-white leading-tight">{invite.title}</p>
                      {invite.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{invite.description}</p>}
                    </div>
                    {onShareTask && (
                      <button onClick={() => onShareTask({ title: invite.title, description: invite.description, category: invite.category, emoji: invite.emoji, gradient: invite.gradient, accent: invite.accent })} className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.09] transition" title="Compartilhar como imagem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 text-white/50"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                      </button>
                    )}
                  </div>

                  {/* Avatares empilhados + status */}
                  {recips.length > 0 && (
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="flex">
                        {recips.slice(0, 6).map((r, i) => (
                          <div key={r.id} className="w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 border-[#15151a]" style={{ marginLeft: i > 0 ? "-7px" : 0, zIndex: 10 - i, background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.3))" }}>
                            {r.avatar || r.name?.[0]?.toUpperCase() || "👤"}
                          </div>
                        ))}
                        {recips.length > 6 && <div className="w-7 h-7 rounded-full bg-white/[0.08] border-2 border-[#15151a] flex items-center justify-center text-[10px] text-white/50" style={{ marginLeft: "-7px" }}>+{recips.length - 6}</div>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {accepted > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{accepted}</span>}
                        {declined > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{declined}</span>}
                        {pending  > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/30 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-white/25" />{pending}</span>}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setExpandedId(isExpanded ? null : invite.id)} className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      {recips.length === 0 ? "Adicionar destinatários" : `${recips.length} destinatário${recips.length > 1 ? "s" : ""}`}
                    </button>
                    {onResendFavorites && favoritesCount > 0 && (
                      <button onClick={() => onResendFavorites(invite)} className="ml-auto flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition" style={{ background: "rgba(52,211,153,0.12)", color: FAV_GREEN, border: "1px solid rgba(52,211,153,0.25)" }}>
                        ⭐ Reenviar pros favoritos
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                        <div className="pt-3 flex flex-col gap-2">
                          {recips.map((r) => {
                            const s = statusOf(r);
                            return (
                              <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.3))" }}>{r.avatar || r.name?.[0]?.toUpperCase() || "👤"}</div>
                                <span className="flex-1 text-sm text-white/70 truncate">{r.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dot(s)}`} />
                                  <span className={`text-[11px] font-medium ${color(s)}`}>{label(s)}</span>
                                </div>
                                {s === "pending" && updateRecipientStatus && (
                                  <div className="flex gap-1 ml-1">
                                    <button onClick={() => updateRecipientStatus(invite.id, r.id, "accepted")} className="w-6 h-6 rounded-lg bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center hover:bg-emerald-400/25 transition" title="Simular aceitar">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-emerald-400"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                    <button onClick={() => updateRecipientStatus(invite.id, r.id, "declined")} className="w-6 h-6 rounded-lg bg-red-400/15 border border-red-400/25 flex items-center justify-center hover:bg-red-400/25 transition" title="Simular recusar">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {addRecipient && (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                value={inputValues[invite.id] || ""}
                                onChange={(e) => setInputValues((v) => ({ ...v, [invite.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") { addRecipient(invite.id, inputValues[invite.id] || ""); setInputValues((v) => ({ ...v, [invite.id]: "" })); } }}
                                placeholder="Nome do destinatário..."
                                className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/50 transition"
                              />
                              <button onClick={() => { addRecipient(invite.id, inputValues[invite.id] || ""); setInputValues((v) => ({ ...v, [invite.id]: "" })); }} className="w-9 h-9 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center hover:bg-[#2563eb]/30 transition flex-shrink-0">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              </button>
                              <button onClick={() => shareInvite(invite)} className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.09] transition flex-shrink-0" title="Compartilhar link">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/40"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────
export function SocialExplore({
  isDesktop, isLoggedIn, userId, social, tasks,
  invites, addRecipient, updateRecipientStatus, shareInvite, onMassSend, onResendFavorites,
  showToast, unreadCount, onCreateGroup, onShareTask, onRequireLogin,
}) {
  const [subTab, setSubTab] = useState("amigos"); // "amigos" | "enviados"
  const favoritesCount = social.friends.filter(f => f.isCloseFriend).length;

  const tabs = [
    { id: "amigos",   label: "Amigos",   badge: social.pendingIncoming.length },
    { id: "enviados", label: "Convites enviados", badge: unreadCount },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col h-full overflow-y-auto ${isDesktop ? "px-8 pt-8" : "px-5 pt-4"}`}
    >
      <div className={`w-full ${isDesktop ? "max-w-[720px] mx-auto" : ""} pb-10`}>
        {/* Header */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Social</p>
          <h2 className={`font-bold text-white ${isDesktop ? "text-2xl" : "text-lg"}`}>Interagir</h2>
          <p className="text-sm text-white/40 mt-0.5">Amigos, favoritos, delegações e enquetes.</p>
        </div>

        {/* Toggle pill de sub-abas */}
        <div className="inline-flex gap-1 bg-white/[0.05] border border-white/[0.07] p-1 rounded-xl mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                subTab === tab.id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-[3px]">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {subTab === "amigos" ? (
          !isLoggedIn ? (
            <LoginPrompt onRequireLogin={onRequireLogin} />
          ) : (
            <div className="flex flex-col gap-6">
              <FriendsPanel social={social} showToast={showToast} isDesktop={isDesktop} />
              <MassSendCard tasks={tasks} social={social} onMassSend={onMassSend} showToast={showToast} isDesktop={isDesktop} />
            </div>
          )
        ) : (
          <SentInvitesPanel
            invites={invites}
            addRecipient={addRecipient}
            updateRecipientStatus={updateRecipientStatus}
            shareInvite={shareInvite}
            onResendFavorites={isLoggedIn ? onResendFavorites : null}
            favoritesCount={favoritesCount}
            onCreateGroup={onCreateGroup}
            onShareTask={onShareTask}
            isLoggedIn={isLoggedIn}
            userId={userId}
            showToast={showToast}
          />
        )}
      </div>
    </motion.div>
  );
}

function LoginPrompt({ onRequireLogin }) {
  return (
    <div className="rounded-3xl p-6 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(29,78,216,0.12), rgba(124,58,237,0.12))", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-4xl mb-3">👥</div>
      <p className="text-base font-semibold text-white mb-1">Conecte com amigos</p>
      <p className="text-[13px] text-white/40 leading-relaxed mb-4 max-w-xs mx-auto">
        Entre para adicionar amigos, marcar favoritos e enviar tasks em massa. Suas decisões e convites locais continuam aqui.
      </p>
      <button onClick={onRequireLogin} className="px-5 py-2.5 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-blue-500 transition">
        Entrar com email
      </button>
    </div>
  );
}
