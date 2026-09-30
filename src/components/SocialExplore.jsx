import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMyPolls, deletePoll } from "../lib/polls";
import { CobrancasPanel } from "./CobrancasPanel.jsx";
import { DividirPanel } from "./DividirPanel.jsx";
import { CONQUISTAS } from "../lib/conquistas.js";

/*
 * SocialExplore — aba Social: cobranças, divisão de contas (Supabase),
 * amigos e enquetes Bora?.
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
        borderColor: close ? FAV_GREEN : "rgb(var(--ink) / 0.1)",
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
      style={{ color: active ? FAV_GREEN : "rgb(var(--ink) / 0.3)" }}
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
                  <motion.button whileTap={{ scale: 0.9 }} disabled={busy.has(friendshipId)} onClick={() => run(friendshipId, () => social.rejectFriend(friendshipId), "Não foi possível recusar.")} aria-label={`Recusar pedido de @${profile?.username}`} className="w-8 h-8 rounded-xl bg-red-400/15 border border-red-400/25 flex items-center justify-center hover:bg-red-400/25 transition disabled:opacity-40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} disabled={busy.has(friendshipId)} onClick={() => run(friendshipId, async () => { await social.acceptFriend(friendshipId); showToast("Amizade aceita! 🎉", "bg-emerald-600/90"); }, "Não foi possível aceitar.")} aria-label={`Aceitar pedido de @${profile?.username}`} className="w-8 h-8 rounded-xl bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center hover:bg-emerald-400/25 transition disabled:opacity-40">
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
            {favorites.map(({ friendshipId, profile, stats }) => (
              <div key={friendshipId} className="flex items-center gap-2.5 rounded-2xl px-4 py-3 border" style={{ borderColor: "rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.08)" }}>
                <Avatar emoji={profile?.avatar_emoji} close />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.display_name || profile?.username}</p>
                  <p className="text-[11px] truncate" style={{ color: "rgba(52,211,153,0.8)" }}>@{profile?.username}</p>
                  <FriendStats stats={stats} />
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
            {others.map(({ friendshipId, profile, stats }) => (
              <div key={friendshipId} className="flex items-center gap-2.5 rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.06]">
                <Avatar emoji={profile?.avatar_emoji} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.display_name || profile?.username}</p>
                  <p className="text-[11px] text-white/40 truncate">@{profile?.username}</p>
                  <FriendStats stats={stats} />
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

// Lado público do perfil de um amigo (profile_stats). Nunca tem valor em R$.
function FriendStats({ stats }) {
  if (!stats) return null;
  const n = stats.conquistas?.length || 0;
  return (
    <p className="text-[10.5px] text-white/45 truncate mt-0.5 tabular-nums">
      Nv {stats.nivel}{stats.ofensiva > 0 && ` · 🔥 ${stats.ofensiva}`}{n > 0 && ` · 🏆 ${n}/${CONQUISTAS.length}`}
    </p>
  );
}

// ── Card de envio em massa ───────────────────────────────────────
function MyPolls({ userId, showToast }) {
  const [polls,   setPolls]   = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchMyPolls(userId).then((p) => { setPolls(p); setLoading(false); });
  }, [userId]);
  useEffect(() => { refresh(); }, [refresh]);

  function pollLink(id) { return `${window.location.origin}${window.location.pathname}#/bora/${id}`; }

  async function apagar(p) {
    if (!window.confirm(`Apagar a enquete "${p.title}"? Os votos somem junto e o link para de funcionar.`)) return;
    try {
      await deletePoll(p.id);
      setPolls((prev) => prev.filter((x) => x.id !== p.id));
      showToast?.("Enquete apagada", "bg-red-600/90");
    } catch (e) {
      showToast?.(e.message || "Não deu pra apagar", "bg-red-600/90");
    }
  }

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
          <a href={pollLink(p.id)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-[#2563eb]/15 border border-[#2563eb]/30 text-[12px] font-medium text-blue-300 hover:bg-[#2563eb]/25 transition flex-shrink-0">Resultados</a>
          <button onClick={() => apagar(p)} title="Apagar enquete" aria-label={`Apagar enquete ${p.title}`} className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-400/30 transition flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────
export function SocialExplore({
  isDesktop, isLoggedIn, userId, social, splits, cob, finance, nome,
  showToast, onCreatePoll, onRequireLogin, initialTab = "cobrancas",
}) {
  const [subTab, setSubTab] = useState(initialTab); // "cobrancas" | "dividir" | "amigos"
  const cobrancasAbertas = cob.cobrancas.filter(c => !c.arquivada).length;

  const tabs = [
    { id: "cobrancas", label: "Cobranças", count: cobrancasAbertas },
    { id: "dividir",   label: "Dividir" },
    { id: "amigos",    label: "Amigos & Bora", badge: social.pendingIncoming.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col h-full overflow-y-auto ${isDesktop ? "px-8 pt-8" : "px-5 pt-4"}`}
    >
      <div className={`w-full ${isDesktop ? "max-w-[720px] mx-auto" : ""} pb-10`}>
        <div className="mb-4">
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Social</p>
          <h2 className={`font-bold text-white ${isDesktop ? "text-2xl" : "text-lg"}`}>Dividir e cobrar</h2>
          <p className="text-sm text-white/40 mt-0.5">Só o que você escolhe dividir sai do seu aparelho.</p>
        </div>

        <div className="flex gap-1 bg-white/[0.05] border border-white/[0.07] p-1 rounded-xl mb-6 overflow-x-auto" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`relative flex-1 whitespace-nowrap px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                subTab === tab.id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 text-[11px] text-white/35 tabular-nums">{tab.count}</span>}
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-[3px]">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {subTab === "cobrancas" && <CobrancasPanel cob={cob} finance={finance} nome={nome} showToast={showToast} />}
        {subTab === "dividir" && (
          !isLoggedIn
            ? <LoginPrompt onRequireLogin={onRequireLogin} texto="Entre pra criar grupos com amigos, lançar despesas divididas e ver quem deve pra quem. Entrando, seus saldos, contas e extrato também ficam salvos na sua conta." />
            : <DividirPanel splits={splits} social={social} userId={userId} finance={finance} showToast={showToast} />
        )}
        {subTab === "amigos" && (
          <div className="flex flex-col gap-6">
            {isLoggedIn
              ? <FriendsPanel social={social} showToast={showToast} isDesktop={isDesktop} />
              : <LoginPrompt onRequireLogin={onRequireLogin} texto="Entre pra adicionar amigos e dividir contas com eles." />}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30">Bora? — decidir o rolê</h3>
                <button onClick={onCreatePoll} className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-[12px] font-semibold text-purple-300 hover:bg-purple-500/30 transition">🗳️ Nova enquete</button>
              </div>
              <MyPolls userId={userId} showToast={showToast} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoginPrompt({ onRequireLogin, texto }) {
  return (
    <div className="rounded-3xl p-6 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(29,78,216,0.12), rgba(124,58,237,0.12))", border: "1px solid rgb(var(--ink) / 0.08)" }}>
      <div className="text-4xl mb-3">👥</div>
      <p className="text-base font-semibold text-white mb-1">Entre pra dividir com amigos</p>
      <p className="text-[13px] text-white/40 leading-relaxed mb-4 max-w-xs mx-auto">
        {texto}
      </p>
      <button onClick={onRequireLogin} className="px-5 py-2.5 rounded-2xl bg-[#2563eb] text-white text-sm font-semibold hover:bg-blue-500 transition">
        Entrar com email
      </button>
    </div>
  );
}
