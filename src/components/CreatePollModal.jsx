import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPoll } from "../lib/polls";
import { usePoll } from "../hooks/usePoll.js";
import { PollResults } from "./PollResults.jsx";

const EMOJI_SUGGESTIONS = ["🎬", "🍕", "🍔", "🎮", "🏖️", "⚽", "🎸", "📍", "🛒", "🍻", "☕", "🏠"];

function pollLink(id) {
  return `${window.location.origin}${window.location.pathname}#/bora/${id}`;
}

// Resultados ao vivo embutidos pro criador acompanhar dentro do modal.
function PollLiveResults({ pollId, showToast }) {
  const { poll, tally, totalVoters, isCreator, closePoll, loading } = usePoll(pollId);
  if (loading || !poll) return <div className="py-6 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" /></div>;
  if (totalVoters === 0) {
    return <p className="text-[13px] text-white/35 text-center py-6">Ninguém votou ainda. Compartilhe o link! 👆</p>;
  }
  return <PollResults poll={poll} tally={tally} totalVoters={totalVoters} isCreator={isCreator} onClosePoll={closePoll} showToast={showToast} />;
}

export function CreatePollModal({ onClose, userId, showToast, isDesktop }) {
  const [phase,   setPhase]   = useState("form"); // form | done
  const [title,   setTitle]   = useState("");
  const [type,    setType]    = useState("single");
  const [options, setOptions] = useState([{ emoji: "", label: "" }, { emoji: "", label: "" }]);
  const [creating, setCreating] = useState(false);
  const [error,   setError]   = useState("");
  const [createdId, setCreatedId] = useState(null);
  const [showResults, setShowResults] = useState(false);

  function setOpt(i, patch) { setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o)); }
  function addOpt() { if (options.length < 10) setOptions((prev) => [...prev, { emoji: "", label: "" }]); }
  function removeOpt(i) { if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleGenerate() {
    setError("");
    setCreating(true);
    try {
      const id = await createPoll({ title, type, options, userId });
      setCreatedId(id);
      setPhase("done");
      try { await navigator.clipboard?.writeText(pollLink(id)); showToast?.("Link copiado!", "bg-emerald-600/90"); } catch { /* ignore */ }
    } catch (err) {
      setError(err.message || "Não foi possível criar a enquete.");
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(pollLink(createdId));
    showToast?.("Link copiado!", "bg-emerald-600/90");
  }
  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(`${title}\nVota aí 👉 ${pollLink(createdId)}`)}`;
    window.open(url, "_blank");
  }

  return (
    <div className={`fixed inset-0 z-[80] flex bg-black/70 backdrop-blur-sm px-4 ${isDesktop ? "items-center justify-center" : "items-end"}`}
      style={{ paddingBottom: isDesktop ? undefined : "max(env(safe-area-inset-bottom), 16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-purple-400/70 mb-0.5">Enquete de grupo</p>
            <h2 className="text-base font-bold text-white">Bora? 🗳️</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <AnimatePresence mode="wait">
            {phase === "form" ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                {/* Título */}
                <div>
                  <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">Pergunta</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Qual filme a gente vê?"
                    autoFocus
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">Tipo de resposta</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: "single",   t: "Escolha única",  d: "Vota em 1 opção" },
                      { v: "multiple", t: "Múltipla",       d: "Marca várias" },
                    ].map((o) => (
                      <button key={o.v} type="button" onClick={() => setType(o.v)}
                        className={`p-3 rounded-2xl border text-left transition ${type === o.v ? "bg-[#2563eb]/15 border-[#2563eb]/40" : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]"}`}>
                        <p className={`text-[13px] font-semibold ${type === o.v ? "text-[#93c5fd]" : "text-white/70"}`}>{o.t}</p>
                        <p className="text-[11px] text-white/30 mt-0.5">{o.d}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opções */}
                <div>
                  <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">Opções (mín. 2)</label>
                  <div className="flex flex-col gap-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={opt.emoji}
                          onChange={(e) => setOpt(i, { emoji: e.target.value.slice(0, 2) })}
                          placeholder={EMOJI_SUGGESTIONS[i % EMOJI_SUGGESTIONS.length]}
                          className="w-11 flex-shrink-0 text-center rounded-xl border border-white/[0.08] bg-white/[0.05] px-1 py-2.5 text-base text-white placeholder:text-white/20 outline-none focus:border-[#2563eb]/60 transition"
                        />
                        <input
                          value={opt.label}
                          onChange={(e) => setOpt(i, { label: e.target.value })}
                          placeholder={`Opção ${i + 1}`}
                          className="flex-1 min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
                        />
                        {options.length > 2 && (
                          <button onClick={() => removeOpt(i)} className="w-8 h-8 flex-shrink-0 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/30 hover:text-red-400 transition">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {options.length < 10 && (
                    <button onClick={addOpt} className="mt-2 flex items-center gap-1.5 text-[13px] text-[#3b82f6]/70 hover:text-[#3b82f6] transition">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Adicionar opção
                    </button>
                  )}
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={creating}
                  className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : "Gerar link 🔗"}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <div className="text-center pt-1">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-base font-bold text-white">Enquete criada!</p>
                  <p className="text-[13px] text-white/40 mt-0.5">Manda o link pra galera votar — sem precisar de conta.</p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2.5">
                  <span className="flex-1 text-[12px] text-white/60 truncate">{pollLink(createdId)}</span>
                  <button onClick={copyLink} className="flex-shrink-0 text-[12px] font-medium text-[#3b82f6] hover:text-blue-400 transition">Copiar</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={shareWhatsApp} className="py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-medium text-emerald-400 hover:bg-emerald-500/25 transition">Mandar no Zap</button>
                  <button onClick={() => setShowResults((s) => !s)} className="py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium text-white/70 hover:bg-white/[0.08] transition">
                    {showResults ? "Ocultar" : "Acompanhar"} resultados
                  </button>
                </div>

                <AnimatePresence>
                  {showResults && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-2 border-t border-white/[0.06]">
                        <PollLiveResults pollId={createdId} showToast={showToast} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={onClose} className="text-[13px] text-white/40 hover:text-white/60 transition py-1">Fechar</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
