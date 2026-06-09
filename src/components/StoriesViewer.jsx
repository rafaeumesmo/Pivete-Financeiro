import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";

const STORY_DURATION = 5000;

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function StoriesViewer({ storyGroup, onClose, onRespond, userId }) {
  const { author, tasks } = storyGroup;
  const [idx, setIdx]     = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(null);
  const timerRef    = useRef(null);
  const task = tasks[idx];

  function advance() {
    if (idx < tasks.length - 1) setIdx(i => i + 1);
    else onClose();
  }

  function back() {
    if (idx > 0) setIdx(i => i - 1);
  }

  // Progress bar
  useEffect(() => {
    if (paused || !progressRef.current) return;
    const el = progressRef.current;
    el.style.transition = "none";
    el.style.width = "0%";
    requestAnimationFrame(() => {
      el.style.transition = `width ${STORY_DURATION}ms linear`;
      el.style.width = "100%";
    });
    timerRef.current = setTimeout(advance, STORY_DURATION);
    return () => { clearTimeout(timerRef.current); };
  }, [idx, paused]);

  // Swipe down to close
  const y = useMotionValue(0);
  function onDragEnd(_, info) {
    if (info.offset.y > 80 || info.velocity.y > 300) onClose();
    else animate(y, 0, { type: "spring", stiffness: 300, damping: 28 });
  }

  const approvedCount  = task?.responses?.filter(r => r.response === "approved").length  ?? 0;
  const rejectedCount  = task?.responses?.filter(r => r.response === "rejected").length  ?? 0;
  const myResponse     = task?.task_responses?.find(r => r.responder_id === userId)?.response
    ?? task?.myResponse;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full h-full flex flex-col"
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 200 }}
        dragElastic={0.2}
        onDragEnd={onDragEnd}
      >
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3 pb-1 flex-shrink-0 z-10">
          {tasks.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
              {i === idx ? (
                <div ref={progressRef} className="h-full bg-white rounded-full" style={{ width: "0%" }} />
              ) : (
                <div className={`h-full bg-white rounded-full ${i < idx ? "" : "opacity-0"}`}
                  style={{ width: i < idx ? "100%" : "0%" }} />
              )}
            </div>
          ))}
        </div>

        {/* Author header */}
        <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 z-10">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xl border-2 border-emerald-400/60">
            {author.avatar_emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">@{author.username}</p>
            <p className="text-[11px] text-white/50">{timeAgo(task?.created_at)}</p>
          </div>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/60 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Story card */}
        <div className="flex-1 min-h-0 px-4 py-2 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`w-full h-full rounded-3xl overflow-hidden relative ${
                task?.image_url ? "bg-black" : `bg-gradient-to-br ${task?.gradient || "from-blue-600 to-purple-700"}`
              }`}
            >
              {task?.image_url && (
                <img src={task.image_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

              {/* Category + Emoji */}
              <div className="absolute top-5 left-5 z-10">
                <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">
                  {task?.category}
                </span>
              </div>
              <div className="absolute top-5 right-5 z-10 text-4xl filter drop-shadow-lg">{task?.emoji}</div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5 leading-tight">{task?.title}</h2>
                {task?.description && (
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-2">{task?.description}</p>
                )}

                {/* Response counts */}
                {(approvedCount > 0 || rejectedCount > 0) && (
                  <div className="flex items-center gap-3 mt-3">
                    {approvedCount > 0 && (
                      <span className="text-[12px] text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                        ✓ {approvedCount}
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="text-[12px] text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-full">
                        ✕ {rejectedCount}
                      </span>
                    )}
                    <span className="text-[11px] text-white/30">responderam</span>
                  </div>
                )}
              </div>

              {/* Tap zones */}
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                onPointerDown={e => { e.stopPropagation(); setPaused(true); }}
                onPointerUp={e => { e.stopPropagation(); setPaused(false); back(); }}
              />
              <div
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                onPointerDown={e => { e.stopPropagation(); setPaused(true); }}
                onPointerUp={e => { e.stopPropagation(); setPaused(false); advance(); }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center justify-center gap-4 px-6 py-4">
          {myResponse ? (
            <div className="text-center">
              <span className="text-[13px] text-white/40">
                {myResponse === "approved" ? "✓ Você aprovou" : myResponse === "rejected" ? "✕ Você recusou" : "↑ Você recompartilhou"}
              </span>
            </div>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onRespond(task.id, "rejected"); advance(); }}
                className="w-14 h-14 rounded-full border-2 border-red-500/50 text-red-400 flex items-center justify-center hover:bg-red-500/10 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onRespond(task.id, "reshared"); advance(); }}
                className="w-12 h-12 rounded-full border-2 border-blue-500/50 text-blue-400 flex items-center justify-center hover:bg-blue-500/10 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onRespond(task.id, "approved"); advance(); }}
                className="w-14 h-14 rounded-full border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/10 transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
