import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePoll } from "../hooks/usePoll.js";
import { PollResults } from "./PollResults.jsx";
import { getNick, setNick as persistNick } from "../lib/anon";

function getPollId() {
  const m = window.location.hash.match(/^#\/bora\/([^/?]+)/);
  return m ? m[1] : null;
}

function Shell({ children }) {
  return (
    <div
      className="min-h-screen bg-[#0d0d0f] flex flex-col items-center px-4"
      style={{ paddingTop: "max(env(safe-area-inset-top), 24px)", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
    >
      <div className="w-full max-w-md flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function Branding() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-5 flex-shrink-0">
      <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/30">feito no</span>
      <span className="text-sm font-black text-white">Task<span style={{ color: "#2563eb" }}>Match</span></span>
    </div>
  );
}

function CreateCTA() {
  return (
    <a
      href={`${window.location.origin}${window.location.pathname}`}
      className="mt-6 block rounded-2xl px-5 py-4 text-center transition hover:brightness-110"
      style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-sm font-semibold text-white">Gostou? Crie a sua no TaskMatch</p>
      <p className="text-[12px] text-white/40 mt-0.5">Decisões em grupo, sem complicação — de graça.</p>
    </a>
  );
}

export default function BoraPage() {
  const pollId = getPollId();
  const { poll, options, loading, error, myVotes, isCreator, totalVoters, tally, submitVotes, closePoll } = usePoll(pollId);

  const [nick, setNick]       = useState(getNick());
  const [selected, setSelected] = useState(new Set());
  const [editing, setEditing] = useState(false);   // forçar voltar pra votação
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg]   = useState("");

  const hasVoted = myVotes.length > 0;

  // Pré-seleciona com os votos já dados (pra "trocar voto").
  useEffect(() => {
    if (myVotes.length) setSelected(new Set(myVotes.map((v) => v.option_id)));
  }, [poll?.id, myVotes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <Shell><Branding /><div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" /></div></Shell>;
  }
  if (error === "notfound" || !poll) {
    return <Shell><Branding /><div className="flex-1 flex flex-col items-center justify-center text-center gap-3"><div className="text-5xl">🔗</div><p className="text-white/50 text-sm">Enquete não encontrada ou link inválido.</p><CreateCTA /></div></Shell>;
  }
  if (error === "config") {
    return <Shell><Branding /><div className="flex-1 flex items-center justify-center text-center"><p className="text-white/50 text-sm">Serviço indisponível no momento.</p></div></Shell>;
  }

  const closed = poll.status === "closed";
  const showResults = (hasVoted && !editing) || closed;

  function toggle(optId) {
    setSelected((prev) => {
      if (poll.type === "single") return new Set([optId]);
      const n = new Set(prev);
      n.has(optId) ? n.delete(optId) : n.add(optId);
      return n;
    });
  }

  async function handleConfirm() {
    setErrMsg("");
    if (!nick.trim()) { setErrMsg("Coloque um apelido pra identificar seu voto."); return; }
    if (selected.size === 0) { setErrMsg("Escolha ao menos uma opção."); return; }
    setSubmitting(true);
    try {
      persistNick(nick.trim());
      await submitVotes([...selected], nick.trim());
      setEditing(false);
    } catch {
      setErrMsg("Não foi possível registrar seu voto. Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <Branding />

      <div className="flex-1">
        {/* Cabeçalho da enquete */}
        <div className="text-center mb-6">
          {closed && <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full mb-3">Encerrada</span>}
          <h1 className="text-[26px] font-bold text-white leading-tight">{poll.title}</h1>
          <p className="text-[13px] text-white/35 mt-1.5">
            {poll.type === "multiple" ? "Marque quantas quiser" : "Escolha uma opção"}
            {totalVoters > 0 && ` · ${totalVoters} já ${totalVoters === 1 ? "votou" : "votaram"}`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {showResults ? (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PollResults poll={poll} tally={tally} totalVoters={totalVoters} isCreator={isCreator} onClosePoll={closePoll} />
              {!closed && (
                <button onClick={() => setEditing(true)} className="w-full mt-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium text-white/60 hover:bg-white/[0.08] transition">
                  Trocar meu voto
                </button>
              )}
              <CreateCTA />
            </motion.div>
          ) : (
            <motion.div key="vote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Apelido */}
              <div className="mb-4">
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="Seu apelido (ex: Rafa)"
                  maxLength={24}
                  className="w-full rounded-2xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#2563eb]/60 transition text-center"
                />
              </div>

              {/* Opções */}
              <div className="flex flex-col gap-2.5">
                {options.map((opt) => {
                  const on = selected.has(opt.id);
                  return (
                    <motion.button
                      key={opt.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggle(opt.id)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition ${
                        on ? "bg-[#2563eb]/15 border-[#2563eb]/50" : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]"
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{opt.emoji || "▫️"}</span>
                      <span className="flex-1 text-[15px] font-medium text-white">{opt.label}</span>
                      <span className={`w-6 h-6 flex items-center justify-center flex-shrink-0 border-2 ${poll.type === "single" ? "rounded-full" : "rounded-md"} ${on ? "bg-[#2563eb] border-[#2563eb]" : "border-white/20"}`}>
                        {on && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {errMsg && <p className="text-[12px] text-red-400 text-center mt-3">{errMsg}</p>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full mt-4 py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : (hasVoted ? "Atualizar voto" : "Confirmar voto")}
              </motion.button>
              {hasVoted && (
                <button onClick={() => setEditing(false)} className="w-full mt-2 py-2 text-[13px] text-white/40 hover:text-white/60 transition">
                  Ver resultados
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
