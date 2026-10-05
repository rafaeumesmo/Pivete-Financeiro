import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPoll } from "../lib/polls";
import { usePoll } from "../hooks/usePoll.js";
import { PollResults } from "./PollResults.jsx";
import { MoneyInput } from "./MoneyInput.jsx";
import { X, Plus, Link2, SmilePlus, CircleCheck } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { btnCls, inputCls, labelCls } from "./ui.jsx";


function pollLink(id) {
  return `${window.location.origin}${window.location.pathname}#/bora/${id}`;
}

// Resultados ao vivo embutidos pro criador acompanhar dentro do modal.
function PollLiveResults({ pollId, showToast }) {
  const { poll, tally, totalVoters, isCreator, closePoll, loading } = usePoll(pollId);
  if (loading || !poll) return <div className="py-6 flex justify-center"><div className="w-6 h-6 rounded-full border-2 border-line border-t-brand animate-spin" /></div>;
  if (totalVoters === 0) {
    return <p className="text-[13px] text-fg-3 text-center py-6">Ninguém votou ainda. Compartilhe o link.</p>;
  }
  return <PollResults poll={poll} tally={tally} totalVoters={totalVoters} isCreator={isCreator} onClosePoll={closePoll} showToast={showToast} />;
}

export function CreatePollModal({ onClose, userId, showToast, isDesktop }) {
  const [phase,   setPhase]   = useState("form"); // form | done
  const [title,   setTitle]   = useState("");
  const [type,    setType]    = useState("single");
  const [options, setOptions] = useState([{ emoji: "", label: "", budget: 0 }, { emoji: "", label: "", budget: 0 }]);
  const [creating, setCreating] = useState(false);
  const [error,   setError]   = useState("");
  const [createdId, setCreatedId] = useState(null);
  const [showResults, setShowResults] = useState(false);

  function setOpt(i, patch) { setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o)); }
  function addOpt() { if (options.length < 10) setOptions((prev) => [...prev, { emoji: "", label: "", budget: 0 }]); }
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
      const msg = err?.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch")) {
        setError("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
      } else {
        setError(msg || "Não foi possível criar a enquete.");
      }
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(pollLink(createdId));
    showToast?.("Link copiado!", "bg-emerald-600/90");
  }
  function shareWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(`${title}\nVota aí: ${pollLink(createdId)}`)}`;
    window.open(url, "_blank");
  }

  return (
    <div className={`fixed inset-0 z-[80] flex bg-black/40 px-4 ${isDesktop ? "items-center justify-center" : "items-end"}`}
      style={{ paddingBottom: isDesktop ? undefined : "max(env(safe-area-inset-bottom), 16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface rounded-lg border border-line shadow overflow-hidden max-h-[88vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-line">
          <div>
            <h2 className="text-base font-semibold text-fg">Bora?</h2>
            <p className="text-[13px] text-fg-2">Enquete de grupo</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-md flex items-center justify-center text-fg-2 hover:text-fg hover:bg-tile transition"><X size={18} strokeWidth={ICON_STROKE} aria-hidden /></button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <AnimatePresence mode="wait">
            {phase === "form" ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                {/* Título */}
                <div>
                  <label className={labelCls}>Pergunta</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Qual filme a gente vê?"
                    autoFocus
                    className={inputCls}
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className={labelCls}>Tipo de resposta</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: "single",   t: "Escolha única",  d: "Vota em 1 opção" },
                      { v: "multiple", t: "Múltipla",       d: "Marca várias" },
                    ].map((o) => (
                      <button key={o.v} type="button" onClick={() => setType(o.v)}
                        className={`p-3 rounded-lg border text-left transition ${type === o.v ? "bg-brand/[0.06] border-brand" : "bg-surface border-line hover:bg-tile"}`}>
                        <p className={`text-[13px] font-semibold ${type === o.v ? "text-brand-ink" : "text-fg"}`}>{o.t}</p>
                        <p className="text-[12px] text-fg-3 mt-0.5">{o.d}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opções */}
                <div>
                  <label className={labelCls}>Opções (mín. 2)</label>
                  <div className="flex flex-col gap-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="relative w-11 flex-shrink-0">
                          <input
                            value={opt.emoji}
                            onChange={(e) => setOpt(i, { emoji: e.target.value.slice(0, 2) })}
                            aria-label={`Emoji da opção ${i + 1} (opcional)`}
                            title="Emoji (opcional)"
                            className="w-11 text-center rounded-md border border-line bg-surface px-1 py-2.5 text-base text-fg outline-none focus:border-brand transition"
                          />
                          {!opt.emoji && <SmilePlus size={18} strokeWidth={ICON_STROKE} className="absolute inset-0 m-auto text-fg-3 pointer-events-none" aria-hidden />}
                        </span>
                        <input
                          value={opt.label}
                          onChange={(e) => setOpt(i, { label: e.target.value })}
                          placeholder={`Opção ${i + 1}`}
                          className={`flex-1 min-w-0 ${inputCls}`}
                        />
                        {options.length > 2 && (
                          <button onClick={() => removeOpt(i)} aria-label={`Remover opção ${i + 1}`} className="w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center text-fg-3 hover:text-neg hover:bg-tile transition">
                            <X size={16} strokeWidth={ICON_STROKE} aria-hidden />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pl-[52px]">
                        <span className="text-[12px] text-fg-2 flex-shrink-0">Por pessoa</span>
                        <MoneyInput ariaLabel={`Orçamento por pessoa da opção ${i + 1}`} value={opt.budget} onChange={(budget) => setOpt(i, { budget })}
                          className={`w-28 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] outline-none focus:border-brand ${opt.budget ? "text-fg" : "text-fg-3"}`} />
                        {opt.budget > 0 && <button type="button" onClick={() => setOpt(i, { budget: 0 })} className="text-[12px] text-fg-3 hover:text-fg-2">limpar</button>}
                      </div>
                      </div>
                    ))}
                  </div>
                  {options.length < 10 && (
                    <button onClick={addOpt} className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-brand-ink hover:underline">
                      <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden />
                      Adicionar opção
                    </button>
                  )}
                </div>

                {error && <p className="text-[12px] text-neg">{error}</p>}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={creating}
                  className="w-full py-3.5 rounded-lg bg-brand text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <span className="w-4 h-4 rounded-full border-2 border-on-brand/30 border-t-on-brand animate-spin" /> : <><Link2 size={16} strokeWidth={ICON_STROKE} aria-hidden />Gerar link</>}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <div className="text-center pt-1">
                  <span className="mx-auto mb-3 w-12 h-12 rounded-md bg-tile text-pos flex items-center justify-center" aria-hidden><CircleCheck size={24} strokeWidth={ICON_STROKE} /></span>
                  <p className="text-base font-semibold text-fg">Enquete criada</p>
                  <p className="text-[13px] text-fg-2 mt-0.5">Manda o link pra galera votar — sem precisar de conta.</p>
                </div>

                <div className="flex items-center gap-2 rounded-md bg-surface border border-line px-3 py-2.5">
                  <span className="flex-1 text-[12px] text-fg-2 truncate">{pollLink(createdId)}</span>
                  <button onClick={copyLink} className="flex-shrink-0 text-[12px] font-medium text-brand-ink hover:text-brand-ink transition">Copiar</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={shareWhatsApp} className={`${btnCls.primary} py-2.5 text-sm`}>Mandar no Zap</button>
                  <button onClick={() => setShowResults((s) => !s)} className={`${btnCls.secondary} py-2.5 text-sm`}>
                    {showResults ? "Ocultar" : "Acompanhar"} resultados
                  </button>
                </div>

                <AnimatePresence>
                  {showResults && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-2 border-t border-line">
                        <PollLiveResults pollId={createdId} showToast={showToast} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={onClose} className="text-[13px] text-fg-2 hover:text-fg-2 transition py-1">Fechar</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
