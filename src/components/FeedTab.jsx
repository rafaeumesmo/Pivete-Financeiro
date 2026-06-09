import { useState, useMemo } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { AuthScreen } from "./AuthScreen.jsx";
import { FriendsTab } from "./FriendsTab.jsx";
import { StoriesViewer } from "./StoriesViewer.jsx";

const SWIPE_THRESHOLD = 100;
const SWIPE_UP_THRESHOLD = -80;

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── StoryRing ────────────────────────────────────────────────────
function StoryRing({ storyGroup, onOpen }) {
  const { author, hasUnread, isCloseFriend } = storyGroup;

  const ringStyle = isCloseFriend
    ? { border: hasUnread ? "2.5px solid #34d399" : "2.5px solid rgba(52,211,153,0.3)" }
    : {
        border: "2.5px solid transparent",
        backgroundImage: hasUnread
          ? "linear-gradient(#111114,#111114), linear-gradient(135deg,#7c3aed,#2563eb,#06b6d4)"
          : "linear-gradient(#111114,#111114), linear-gradient(135deg,rgba(124,58,237,0.3),rgba(37,99,235,0.3))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => onOpen(storyGroup)}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={ringStyle}
      >
        <div className="w-[46px] h-[46px] rounded-full bg-white/[0.08] flex items-center justify-center text-2xl">
          {author.avatar_emoji}
        </div>
      </div>
      <span className="text-[10px] text-white/40 max-w-[56px] truncate">@{author.username}</span>
    </motion.button>
  );
}

// ── SocialFeedCard ───────────────────────────────────────────────
function SocialFeedCard({ task, onRespond, isTop, stackIndex, swipeExitVal }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ      = useTransform(x, [-200, 200], [-18, 18]);
  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const redOpacity   = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const blueOpacity  = useTransform(y, [SWIPE_UP_THRESHOLD, 0], [1, 0]);

  function handleDragEnd(_, info) {
    const { velocity: { x: vx, y: vy }, offset: { x: ox, y: oy } } = info;
    if (oy < SWIPE_UP_THRESHOLD || vy < -500)        onRespond(task.id, "reshared",  { vx: 0, vy });
    else if (ox > SWIPE_THRESHOLD || vx > 600)       onRespond(task.id, "approved",  { vx, vy: 0 });
    else if (ox < -SWIPE_THRESHOLD || vx < -600)     onRespond(task.id, "rejected",  { vx, vy: 0 });
    else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  }

  const approvedCount  = task.responses?.filter(r => r.response === "approved").length  ?? 0;
  const rejectedCount  = task.responses?.filter(r => r.response === "rejected").length  ?? 0;
  const uniqueResponders = task.responses?.slice(0, 5) || [];

  if (!isTop) {
    const ts = 1 - stackIndex * 0.04;
    const ty = stackIndex * 12;
    const to = 1 - stackIndex * 0.15;
    return (
      <motion.div
        className="absolute inset-0 mx-auto"
        animate={{ scale: ts, y: ty, opacity: to }}
        style={{ zIndex: 10 - stackIndex, width: "100%", originY: 1 }}
      >
        <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient || "from-blue-700 to-purple-800"} shadow-2xl`} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateZ, zIndex: 20, width: "100%" }}
      drag
      dragConstraints={{ top: -300, bottom: 150, left: -300, right: 300 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileDrag={{ scale: 0.97, filter: "drop-shadow(0 24px 52px rgba(0,0,0,0.6))" }}
      variants={{
        exit: ({ vx = 0, vy = 0, dir } = {}) => {
          const cx = x.get(), cy = y.get();
          if (dir === "reshared") return { y: -700, x: cx * 1.5, rotate: cx * 0.05, opacity: 0, transition: { duration: 0.42, ease: [0.4, 0, 1, 1] } };
          const sign = dir === "approved" ? 1 : -1;
          const exitDur = Math.max(0.26, 0.38 - Math.min(Math.abs(vx), 1200) / 5000);
          return { x: sign * 720, y: cy + 80, rotate: sign * Math.min(Math.abs(vx) / 160, 20), opacity: 0, transition: { duration: exitDur, ease: [0.4, 0, 1, 1] } };
        },
      }}
      exit="exit"
    >
      <div className={`w-full h-full rounded-3xl overflow-hidden shadow-2xl relative select-none ${
        task.image_url ? "bg-black" : `bg-gradient-to-br ${task.gradient || "from-blue-700 to-purple-800"}`
      }`}>
        {task.image_url && <img src={task.image_url} className="absolute inset-0 w-full h-full object-cover" alt="" draggable={false} />}
        <div className={`absolute inset-0 bg-gradient-to-t ${task.image_url ? "from-black/85 via-black/15 to-transparent" : "from-black/60 via-transparent to-transparent"}`} />

        {/* Author header */}
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/55 to-transparent px-4 pt-4 pb-6 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-base flex-shrink-0">
            {task.author?.avatar_emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">@{task.author?.username}</p>
          </div>
          <span className="text-[11px] text-white/40 flex-shrink-0">{timeAgo(task.created_at)}</span>
          {task.audience === "close" && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex-shrink-0">⭐</span>
          )}
        </div>

        {/* Category + Emoji */}
        <div className="absolute top-16 left-5 z-10">
          <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">
            {task.category}
          </span>
        </div>
        <div className="absolute top-14 right-5 z-10 text-4xl filter drop-shadow-lg">{task.emoji}</div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5 leading-tight">{task.title}</h2>
          {task.description && <p className="text-sm text-white/70 leading-relaxed line-clamp-2">{task.description}</p>}

          {/* Response avatars */}
          {uniqueResponders.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex">
                {uniqueResponders.map((r, i) => (
                  <div
                    key={r.id}
                    className="w-6 h-6 rounded-full bg-white/[0.12] border-2 border-black/40 flex items-center justify-center text-xs"
                    style={{ marginLeft: i > 0 ? "-6px" : 0, zIndex: 10 - i }}
                  >
                    {r.responder?.avatar_emoji || "👤"}
                  </div>
                ))}
              </div>
              <span className="text-[11px] text-white/40">
                {approvedCount > 0 && `✓${approvedCount} `}{rejectedCount > 0 && `✕${rejectedCount}`}
              </span>
            </div>
          )}
        </div>

        {/* Overlays */}
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(22,163,74,0.55)", opacity: greenOpacity }}>
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2 -rotate-[20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Aprovei!</span></div>
        </motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(220,38,38,0.55)", opacity: redOpacity }}>
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[20deg]"><span className="text-white font-black text-2xl tracking-widest uppercase">Passei</span></div>
        </motion.div>
        <motion.div className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none" style={{ backgroundColor: "rgba(37,99,235,0.6)", opacity: blueOpacity }}>
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2"><span className="text-white font-black text-2xl tracking-widest uppercase">Recompartilhar ↑</span></div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── FeedTab ──────────────────────────────────────────────────────
export function FeedTab({ isLoggedIn, userId, auth, social, showToast, isMobile }) {
  const [subTab,        setSubTab]       = useState("feed"); // "feed" | "friends"
  const [openStory,     setOpenStory]    = useState(null);
  const [swipeExit,     setSwipeExit]    = useState({ vx: 0, vy: 0, dir: null });

  const unseenFeed = social.feed.filter(t => !t.myResponse);

  async function handleRespond(taskId, response, vel = {}) {
    setSwipeExit({ ...vel, dir: response });
    await social.respondToTask(taskId, response);
    const labels = { approved: "✓ Aprovado!", rejected: "✕ Passou", reshared: "↑ Recompartilhado!" };
    const colors = { approved: "bg-emerald-600/90", rejected: "bg-red-600/90", reshared: "bg-[#2563eb]/90" };
    showToast(labels[response], colors[response]);
  }

  function handleOpenStory(storyGroup) {
    storyGroup.tasks.forEach(t => social.markSeen(t.id));
    setOpenStory(storyGroup);
  }

  if (!isLoggedIn) {
    return <AuthScreen onSendLink={auth.sendMagicLink} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full"
    >
      {/* Sub-tab navigation */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex gap-1 bg-white/[0.05] border border-white/[0.07] p-1 rounded-xl">
          {[
            { id: "feed",    label: "Feed" },
            { id: "friends", label: "Amigos", badge: social.pendingIncoming.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                subTab === tab.id ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-[3px]">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => social.loadFeed()}
          className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/40 hover:text-white transition"
          title="Atualizar feed"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {subTab === "friends" ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <FriendsTab social={social} showToast={showToast} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          {/* Stories row */}
          {social.stories.length > 0 && (
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {social.stories.map(sg => (
                  <StoryRing key={sg.author.id} storyGroup={sg} onOpen={handleOpenStory} />
                ))}
              </div>
            </div>
          )}

          {/* Feed cards */}
          {social.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
                <p className="text-sm text-white/30">Carregando feed...</p>
              </div>
            </div>
          ) : social.friends.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
              <div className="text-5xl">👥</div>
              <div>
                <p className="text-base font-semibold text-white mb-1">Sem amigos ainda</p>
                <p className="text-sm text-white/40 leading-relaxed">Vá para a aba Amigos e adicione pessoas pelo username para ver o feed delas.</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setSubTab("friends")}
                className="px-5 py-2.5 rounded-2xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[#3b82f6] text-sm font-medium hover:bg-[#2563eb]/30 transition"
              >
                + Adicionar amigos
              </motion.button>
            </div>
          ) : unseenFeed.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
              <div className="text-5xl">✨</div>
              <div>
                <p className="text-base font-semibold text-white mb-1">Tudo em dia!</p>
                <p className="text-sm text-white/40 leading-relaxed">
                  Você respondeu tudo no feed. Quando seus amigos compartilharem novas tasks, elas aparecem aqui.
                </p>
              </div>
              {social.stories.length === 0 && (
                <p className="text-[12px] text-white/20">Aguardando novos posts...</p>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 px-5 pt-2 pb-2 relative">
                <div className="relative w-full h-full">
                  <AnimatePresence custom={swipeExit}>
                    {unseenFeed.slice(-3).reverse().map((task, i, arr) => {
                      const isTop = i === 0;
                      const stackIndex = arr.length - 1 - i;
                      return (
                        <SocialFeedCard
                          key={task.id}
                          task={task}
                          isTop={isTop}
                          stackIndex={stackIndex}
                          onRespond={isTop ? handleRespond : () => {}}
                          swipeExitVal={swipeExit}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Hint labels */}
              <div className="flex-shrink-0 flex items-center justify-between px-8 py-1">
                <div className="flex items-center gap-1.5 text-red-400/45">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-[9px] font-semibold tracking-widest uppercase">Passou</span>
                </div>
                <div className="flex flex-col items-center text-blue-400/45">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mb-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
                  <span className="text-[9px] font-semibold tracking-widest uppercase">Recompartilhar</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400/45">
                  <span className="text-[9px] font-semibold tracking-widest uppercase">Aprovei</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex-shrink-0 flex items-center justify-center gap-5 pb-4">
                {(() => {
                  const top = unseenFeed[unseenFeed.length - 1];
                  const buttons = [
                    { id: "rejected",  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>, color: "border-red-500/50 text-red-400 hover:bg-red-500/10", size: "w-14 h-14" },
                    { id: "reshared",  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>, color: "border-blue-500/50 text-blue-400 hover:bg-blue-500/10", size: "w-12 h-12" },
                    { id: "approved",  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>, color: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10", size: "w-14 h-14" },
                  ];
                  return buttons.map(btn => (
                    <motion.button
                      key={btn.id}
                      onClick={() => top && handleRespond(top.id, btn.id)}
                      disabled={!top}
                      className={`${btn.size} rounded-full border-2 flex items-center justify-center transition-all duration-200 ${btn.color} disabled:opacity-30`}
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: 1.06 }}
                    >
                      {btn.icon}
                    </motion.button>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stories viewer */}
      <AnimatePresence>
        {openStory && (
          <StoriesViewer
            key="sv"
            storyGroup={openStory}
            userId={userId}
            onClose={() => setOpenStory(null)}
            onRespond={async (taskId, response) => {
              await social.respondToTask(taskId, response);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
