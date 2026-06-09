import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FriendsTab({ social, showToast }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [sentTo,      setSentTo]      = useState(new Set());

  const { friends, pendingIncoming, pendingOutgoing } = social;

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
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

  async function handleAccept(friendshipId) {
    await social.acceptFriend(friendshipId);
    showToast("Amizade aceita! 🎉", "bg-emerald-600/90");
  }

  async function handleReject(friendshipId) {
    await social.rejectFriend(friendshipId);
  }

  async function handleToggleClose(friendId, current) {
    await social.toggleCloseFriend(friendId, !current);
    showToast(!current ? "Adicionado aos close friends ⭐" : "Removido dos close friends", "bg-white/10");
  }

  const closeFriendsCount = friends.filter(f => f.isCloseFriend).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full overflow-y-auto px-5 pt-4 pb-6"
    >
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Rede Social</p>
        <h2 className="font-bold text-white text-lg">Amigos</h2>
        <p className="text-sm text-white/40 mt-0.5">
          {friends.length} amigo{friends.length !== 1 ? "s" : ""}
          {closeFriendsCount > 0 && ` · ${closeFriendsCount} close friend${closeFriendsCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value.trim()) setResults([]); }}
            placeholder="Buscar por @username..."
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="px-4 py-2.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[#3b82f6] text-sm font-medium hover:bg-[#2563eb]/30 transition disabled:opacity-40 flex items-center gap-1.5"
          >
            {searching
              ? <span className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin" />
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
            }
            Buscar
          </button>
        </form>

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden">
                {results.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
                    <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-xl flex-shrink-0">
                      {u.avatar_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">@{u.username}</p>
                      {u.display_name && u.display_name !== u.username && (
                        <p className="text-[11px] text-white/40 truncate">{u.display_name}</p>
                      )}
                    </div>
                    {sentTo.has(u.id) ? (
                      <span className="text-[11px] text-white/30 bg-white/[0.05] border border-white/[0.07] px-2.5 py-1 rounded-full">Enviado</span>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSendRequest(u)}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-white bg-[#2563eb] hover:bg-blue-500 transition flex-shrink-0"
                      >
                        + Adicionar
                      </motion.button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pending incoming */}
      {pendingIncoming.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-3 flex items-center gap-2">
            Pedidos recebidos
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingIncoming.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {pendingIncoming.map(({ friendshipId, profile }) => (
              <div key={friendshipId} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-xl flex-shrink-0">
                  {profile?.avatar_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">@{profile?.username}</p>
                  {profile?.display_name && <p className="text-[11px] text-white/40">{profile.display_name}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReject(friendshipId)}
                    className="w-8 h-8 rounded-xl bg-red-400/15 border border-red-400/25 flex items-center justify-center hover:bg-red-400/25 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleAccept(friendshipId)}
                    className="w-8 h-8 rounded-xl bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center hover:bg-emerald-400/25 transition"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-emerald-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending outgoing */}
      {pendingOutgoing.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-3">Pedidos enviados</h3>
          <div className="flex flex-col gap-2">
            {pendingOutgoing.map(({ friendshipId, profile }) => (
              <div key={friendshipId} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-xl flex-shrink-0">
                  {profile?.avatar_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/70">@{profile?.username}</p>
                </div>
                <span className="text-[11px] text-white/25 bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-full flex-shrink-0">
                  Aguardando
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div>
        <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-3">
          Amigos aceitos <span className="text-white/20 normal-case font-normal tracking-normal">({friends.length})</span>
        </h3>

        {friends.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
            <div className="text-3xl mb-3">👥</div>
            <p className="text-sm text-white/40">Ainda sem amigos</p>
            <p className="text-[12px] text-white/25 mt-1">Busque por username para adicionar</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            {friends.map(({ friendshipId, profile, isCloseFriend }, i) => (
              <div key={friendshipId} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}>
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 ${isCloseFriend ? "border-emerald-400" : "border-white/10"}`}
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    {profile?.avatar_emoji}
                  </div>
                  {isCloseFriend && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center text-[8px]">⭐</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">@{profile?.username}</p>
                  {profile?.display_name && profile.display_name !== profile.username && (
                    <p className="text-[11px] text-white/40 truncate">{profile.display_name}</p>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToggleClose(profile.id, isCloseFriend)}
                  title={isCloseFriend ? "Remover dos close friends" : "Adicionar aos close friends"}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition flex-shrink-0 ${
                    isCloseFriend
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                      : "bg-white/[0.05] border border-white/[0.08] text-white/30 hover:text-emerald-400 hover:border-emerald-500/30"
                  }`}
                >
                  ⭐
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close friends legend */}
      {friends.length > 0 && (
        <p className="text-[11px] text-white/20 mt-4 text-center leading-relaxed">
          ⭐ = close friend · tasks para close friends só aparecem para eles
        </p>
      )}
    </motion.div>
  );
}
