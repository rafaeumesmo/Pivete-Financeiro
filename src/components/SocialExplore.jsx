import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMyPolls, deletePoll } from "../lib/polls";
import { CobrancasPanel } from "./CobrancasPanel.jsx";
import { DividirPanel } from "./DividirPanel.jsx";
import { Avatar as AvatarBase } from "./Avatar.jsx";
import { MOTIVOS_CONTA } from "../lib/convidado.js";
import { CONQUISTAS } from "../lib/conquistas.js";
import { btnCls, inputCls } from "./ui.jsx";
import { ICON_STROKE } from "../lib/icons.js";
import { Users, UserPlus, Star, Trash2, Search, X, Check, Vote, Link2 } from "lucide-react";

/*
 * SocialExplore — aba Social: cobranças, divisão de contas (Supabase),
 * amigos e enquetes Bora?.
 * Renderiza o MESMO conteúdo nos dois layouts; só o container muda:
 *   - mobile  (< 1024px): coluna única, largura toda, scroll vertical
 *   - desktop (≥ 1024px): mesma largura útil da home (1040px), cards em 2 colunas
 * A safe area do iPhone é tratada pela bottom nav (sibling), então aqui basta
 * um padding inferior generoso pra nada ficar colado.
 */

const AVATAR_TAM = { sm: ["w-7 h-7 text-sm", 14], md: ["w-10 h-10 text-xl", 18], lg: ["w-11 h-11 text-2xl", 20] };
function Avatar({ emoji, close, size = "md" }) {
  const [cls, icon] = AVATAR_TAM[size];
  return <AvatarBase emoji={emoji} className={cls} iconSize={icon} destaque={close} />;
}

function StarButton({ active, onClick, disabled, big = false }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      disabled={disabled}
      title={active ? "Remover dos favoritos" : "Marcar como favorito"}
      aria-label={active ? "Remover dos favoritos" : "Marcar como favorito"}
      aria-pressed={active}
      className={`${big ? "w-10 h-10" : "w-9 h-9"} rounded-md flex items-center justify-center transition flex-shrink-0 disabled:opacity-40 border border-line bg-surface hover:bg-tile ${active ? "text-brand-ink" : "text-fg-3"}`}
    >
      <Star size={16} strokeWidth={ICON_STROKE} fill={active ? "currentColor" : "none"} aria-hidden />
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
      aria-label="Desfazer amizade"
      className="w-9 h-9 rounded-md flex items-center justify-center transition flex-shrink-0 bg-surface border border-line text-fg-3 hover:text-neg hover:bg-tile disabled:opacity-40"
    >
      <Trash2 size={16} strokeWidth={ICON_STROKE} aria-hidden />
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
      showToast(`Pedido enviado para @${profile.username}`, "bg-blue-600/90");
    } catch (err) {
      showToast(err.message || "Erro ao enviar pedido.", "bg-red-600/90");
    }
  }

  function handleToggleClose(friendId, current) {
    run(friendId, async () => {
      await social.toggleCloseFriend(friendId, !current);
      showToast(!current ? "Adicionado aos favoritos" : "Removido dos favoritos", "bg-tile");
    }, "Não foi possível atualizar o favorito.");
  }

  function handleRemove(profile) {
    if (!window.confirm(`Remover @${profile.username} dos amigos?`)) return;
    run(profile.id, async () => {
      await social.removeFriend(profile.id);
      showToast(`@${profile.username} removido dos amigos.`, "bg-tile");
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
            className={`flex-1 ${inputCls}`}
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className={`${btnCls.secondary} px-4 py-2.5 text-sm`}
          >
            {searching
              ? <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-brand animate-spin" />
              : <Search size={16} strokeWidth={ICON_STROKE} aria-hidden />}
            Buscar
          </button>
        </form>
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
              <div className="rounded-lg bg-surface border border-line overflow-hidden">
                {results.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                    <Avatar emoji={u.avatar_emoji} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">@{u.username}</p>
                      {u.display_name && u.display_name !== u.username && <p className="text-[12px] text-fg-2 truncate">{u.display_name}</p>}
                    </div>
                    {sentTo.has(u.id)
                      ? <span className="text-[13px] text-fg-2">Enviado</span>
                      : <motion.button whileTap={{ scale: 0.94 }} onClick={() => handleSendRequest(u)} className={`${btnCls.secondary} px-3 py-1.5 text-[13px] flex-shrink-0`}><UserPlus size={14} strokeWidth={ICON_STROKE} aria-hidden />Adicionar</motion.button>}
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
          <h3 className="text-[15px] font-semibold text-fg mb-3 flex items-center gap-2">
            Pedidos recebidos
            <span className="bg-neg text-on-neg text-[12px] font-semibold px-1.5 py-0.5 rounded-sm tabular-nums">{pendingIncoming.length}</span>
          </h3>
          <div className={grid}>
            {pendingIncoming.map(({ friendshipId, profile }) => (
              <div key={friendshipId} className="flex items-center gap-3 bg-surface border border-line rounded-lg px-4 py-3">
                <Avatar emoji={profile?.avatar_emoji} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">@{profile?.username}</p>
                  {profile?.display_name && <p className="text-[12px] text-fg-2 truncate">{profile.display_name}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <motion.button whileTap={{ scale: 0.9 }} disabled={busy.has(friendshipId)} onClick={() => run(friendshipId, () => social.rejectFriend(friendshipId), "Não foi possível recusar.")} aria-label={`Recusar pedido de @${profile?.username}`} className="w-9 h-9 rounded-md bg-surface border border-line text-neg flex items-center justify-center hover:bg-tile transition disabled:opacity-40">
                    <X size={16} strokeWidth={ICON_STROKE} aria-hidden />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} disabled={busy.has(friendshipId)} onClick={() => run(friendshipId, async () => { await social.acceptFriend(friendshipId); showToast("Amizade aceita", "bg-emerald-600/90"); }, "Não foi possível aceitar.")} aria-label={`Aceitar pedido de @${profile?.username}`} className="w-9 h-9 rounded-md bg-surface border border-line text-pos flex items-center justify-center hover:bg-tile transition disabled:opacity-40">
                    <Check size={16} strokeWidth={ICON_STROKE} aria-hidden />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favoritos em destaque */}
      <div>
        <h3 className="text-[15px] font-semibold text-fg mb-3 flex items-center gap-2">
          Favoritos <span className="text-fg-3 font-normal">({favorites.length})</span>
        </h3>
        {favorites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface p-5 text-center">
            <p className="text-[13px] text-fg">Nenhum favorito ainda</p>
            <p className="text-[13px] text-fg-2 mt-1">Toque na estrela de um amigo para destacá-lo.</p>
          </div>
        ) : (
          <div className={grid}>
            {favorites.map(({ friendshipId, profile, stats }) => (
              <div key={friendshipId} className="flex items-center gap-2.5 rounded-lg px-4 py-3 bg-surface border border-line">
                <Avatar emoji={profile?.avatar_emoji} close />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{profile?.display_name || profile?.username}</p>
                  <p className="text-[12px] text-fg-2 truncate">@{profile?.username}</p>
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
        <h3 className="text-[15px] font-semibold text-fg mb-3">
          Todos os amigos <span className="text-fg-3 font-normal">({friends.length})</span>
        </h3>
        {social.friendsLoading && friends.length === 0 ? (
          <div className="rounded-lg bg-surface border border-line p-8 flex flex-col items-center gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-line border-t-brand animate-spin" />
            <p className="text-[12px] text-fg-3">Carregando amigos...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-lg bg-surface border border-line p-8 text-center">
            <span className="mx-auto mb-3 w-10 h-10 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><Users size={20} strokeWidth={ICON_STROKE} /></span>
            <p className="text-sm text-fg">Ainda sem amigos</p>
            <p className="text-[12px] text-fg-3 mt-1">Busque por @username acima para adicionar</p>
          </div>
        ) : others.length === 0 ? (
          <p className="text-[12px] text-fg-3 px-1">Todos os seus amigos são favoritos.</p>
        ) : (
          <div className={grid}>
            {others.map(({ friendshipId, profile, stats }) => (
              <div key={friendshipId} className="flex items-center gap-2.5 rounded-lg px-4 py-3 bg-surface border border-line">
                <Avatar emoji={profile?.avatar_emoji} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{profile?.display_name || profile?.username}</p>
                  <p className="text-[12px] text-fg-2 truncate">@{profile?.username}</p>
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
    <p className="text-[12px] text-fg-2 truncate mt-0.5 tabular-nums">
      Nível {stats.nivel}{stats.ofensiva > 0 && ` · sequência ${stats.ofensiva}`}{n > 0 && ` · ${n}/${CONQUISTAS.length} conquistas`}
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
    return <div className="rounded-lg bg-surface border border-line p-6 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-line border-t-brand animate-spin" /></div>;
  }
  if (polls.length === 0) {
    return (
      <div className="rounded-lg bg-surface border border-line p-6 text-center">
        <p className="text-[13px] text-fg-2">Você ainda não criou enquetes</p>
        <p className="text-[12px] text-fg-3 mt-1">Crie uma "Bora?" e mande pra galera decidir junto.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-fg">Minhas enquetes</h3>
        <button onClick={refresh} className="text-[13px] font-medium text-brand-ink hover:underline">Atualizar</button>
      </div>
      {polls.map((p) => (
        <div key={p.id} className="rounded-lg bg-surface border border-line px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-tile text-fg flex items-center justify-center flex-shrink-0" aria-hidden><Vote size={18} strokeWidth={ICON_STROKE} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg truncate">{p.title}</p>
            <p className="text-[12px] text-fg-2 mt-0.5 flex items-center gap-1.5">
              <span className={p.status === "open" ? "text-pos" : "text-fg-2"}>{p.status === "open" ? "Aberta" : "Encerrada"}</span>
              · {p.voterCount} voto{p.voterCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(pollLink(p.id)); showToast?.("Link copiado", "bg-emerald-600/90"); }} title="Copiar link" aria-label="Copiar link" className="w-8 h-8 rounded-md bg-surface border border-line flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition flex-shrink-0">
            <Link2 size={16} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
          <a href={pollLink(p.id)} target="_blank" rel="noreferrer" className={`${btnCls.secondary} px-3 py-1.5 text-[13px] flex-shrink-0`}>Resultados</a>
          <button onClick={() => apagar(p)} title="Apagar enquete" aria-label={`Apagar enquete ${p.title}`} className="w-8 h-8 rounded-md bg-surface border border-line flex items-center justify-center text-fg-2 hover:text-neg hover:bg-tile transition flex-shrink-0">
            <Trash2 size={16} strokeWidth={ICON_STROKE} aria-hidden />
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
      className={`flex flex-col h-full overflow-y-auto ${isDesktop ? "px-10 pt-8" : "px-5 pt-4"}`}
    >
      <div className={`w-full ${isDesktop ? "max-w-[1040px] mx-auto" : ""} pb-10`}>
        <div className="mb-4">
          <h2 className={`font-semibold text-fg ${isDesktop ? "text-2xl" : "text-xl"}`}>Dividir e cobrar</h2>
          <p className="text-sm text-fg-2 mt-0.5">Só o que você escolhe dividir sai do seu aparelho.</p>
        </div>

        <div className={`flex gap-1 bg-tile p-1 rounded-md mb-6 overflow-x-auto ${isDesktop ? "w-fit" : ""}`} role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`relative ${isDesktop ? "" : "flex-1"} whitespace-nowrap px-3.5 py-1.5 rounded-sm text-[13px] font-medium transition ${
                subTab === tab.id ? "bg-surface text-fg shadow" : "text-fg-2 hover:text-fg"
              }`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1 text-[12px] text-fg-3 tabular-nums">{tab.count}</span>}
              {tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-sm bg-neg text-on-neg text-[11px] font-semibold flex items-center justify-center px-[3px]">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {subTab === "cobrancas" && <CobrancasPanel cob={cob} finance={finance} nome={nome} showToast={showToast} />}
        {subTab === "dividir" && (
          !isLoggedIn
            ? <LoginPrompt onRequireLogin={onRequireLogin} titulo="Divida com a galera" motivo={MOTIVOS_CONTA.dividir} />
            : <DividirPanel splits={splits} social={social} userId={userId} finance={finance} showToast={showToast} />
        )}
        {subTab === "amigos" && (
          <div className="flex flex-col gap-6">
            {isLoggedIn
              ? <FriendsPanel social={social} showToast={showToast} isDesktop={isDesktop} />
              : <LoginPrompt onRequireLogin={onRequireLogin} titulo="Chame os amigos" motivo={MOTIVOS_CONTA.amigos} />}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-fg">Bora? — decidir o rolê</h3>
                <button onClick={onCreatePoll} className={`${btnCls.secondary} px-3 py-1.5 text-[13px]`}><Vote size={14} strokeWidth={ICON_STROKE} aria-hidden />Nova enquete</button>
              </div>
              <MyPolls userId={userId} showToast={showToast} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoginPrompt({ onRequireLogin, titulo, motivo }) {
  return (
    <div className="rounded-lg p-6 text-center bg-surface border border-line">
      <span className="mx-auto mb-3 w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center" aria-hidden><Users size={24} strokeWidth={ICON_STROKE} /></span>
      <p className="text-base font-semibold text-fg mb-1">{titulo}</p>
      <p className="text-[13px] text-fg-2 leading-relaxed mb-4 max-w-xs mx-auto">{motivo}</p>
      <button type="button" onClick={() => onRequireLogin(motivo)} className={`${btnCls.primary} px-5 py-2.5 text-sm`}>
        Criar conta
      </button>
    </div>
  );
}
