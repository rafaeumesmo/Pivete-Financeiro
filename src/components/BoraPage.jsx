import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePoll } from "../hooks/usePoll.js";
import { PollResults } from "./PollResults.jsx";
import { BoraDeck, gradientFor } from "./BoraDeck.jsx";
import { getNick, setNick as persistNick } from "../lib/anon";

function getPollId() {
  const m = window.location.hash.match(/^#\/bora\/([^/?]+)/);
  return m ? m[1] : null;
}

function Shell({ children }) {
  return (
    <div
      className="min-h-screen bg-[#0d0d0f] flex flex-col items-center px-4"
      style={{ paddingTop: "max(env(safe-area-inset-top), 20px)", paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
    >
      <div className="w-full max-w-md flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function Branding() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4 flex-shrink-0">
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
      <p className="text-sm font-semibold text-white">Gostou? Crie seu Bora no TaskMatch</p>
      <p className="text-[12px] text-white/40 mt-0.5">Decisões em grupo no swipe — de graça, sem complicação.</p>
    </a>
  );
}

export default function BoraPage() {
  const pollId = getPollId();
  const { poll, options, loading, error, myVotes, isCreator, totalVoters, tally, submitVotes, closePoll } = usePoll(pollId);

  const [phase,  setPhase]  = useState(null); // null | "intro" | "deck" | "results"
  const [nick,   setNick]   = useState(getNick());
  const [errMsg, setErrMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const deckOptions = useMemo(
    () => options.map((o, i) => ({ id: o.id, emoji: o.emoji, label: o.label, gradient: gradientFor(i) })),
    [options],
  );
  const hasVoted = myVotes.length > 0;
  const closed = poll?.status === "closed";

  // Define a tela inicial assim que carrega (uma vez só).
  useEffect(() => {
    if (loading || !poll || phase !== null) return;
    setPhase(closed || hasVoted ? "results" : "intro");
  }, [loading, poll, closed, hasVoted, phase]);

  // ── Estados de carregamento / erro ─────────────────────────
  if (loading || phase === null) {
    return <Shell><Branding /><div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" /></div></Shell>;
  }
  if (error === "notfound" || !poll) {
    return <Shell><Branding /><div className="flex-1 flex flex-col items-center justify-center text-center gap-3"><div className="text-5xl">🔗</div><p className="text-white/50 text-sm">Enquete não encontrada ou link inválido.</p><CreateCTA /></div></Shell>;
  }
  if (error === "config") {
    return <Shell><Branding /><div className="flex-1 flex items-center justify-center text-center"><p className="text-white/50 text-sm">Serviço indisponível no momento.</p></div></Shell>;
  }
  if (options.length === 0) {
    return <Shell><Branding /><div className="flex-1 flex flex-col items-center justify-center text-center gap-3"><div className="text-5xl">🤷</div><p className="text-white/50 text-sm">Essa enquete não tem opções.</p><CreateCTA /></div></Shell>;
  }

  async function handleComplete(boraIds) {
    setErrMsg("");
    setSaving(true);
    try {
      persistNick(nick.trim());
      await submitVotes(boraIds, nick.trim());
      setPhase("results");
    } catch {
      setErrMsg("Não foi possível registrar seu voto. Tente de novo.");
      setPhase("results");
    } finally {
      setSaving(false);
    }
  }

  function startDeck() {
    if (!nick.trim()) { setErrMsg("Coloque um apelido pra começar."); return; }
    setErrMsg("");
    persistNick(nick.trim());
    setPhase("deck");
  }

  return (
    <Shell>
      <Branding />

      {/* Cabeçalho */}
      <div className="text-center mb-5 flex-shrink-0">
        {closed && <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full mb-3">Encerrada</span>}
        <h1 className="text-[24px] font-bold text-white leading-tight">{poll.title}</h1>
        {phase === "deck" && (
          <p className="text-[13px] text-white/35 mt-1.5">Arrasta os cards · você é {nick.trim() || "anônimo"}</p>
        )}
        {phase === "intro" && (
          <p className="text-[13px] text-white/35 mt-1.5">
            {poll.type === "multiple" ? "Dá Bora em quantas quiser" : "Escolha sua favorita"}
            {totalVoters > 0 && ` · ${totalVoters} já ${totalVoters === 1 ? "votou" : "votaram"}`}
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* ── Intro: apelido ─────────────────────────────────── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center">
                <div className="text-4xl mb-3">🤙</div>
                <p className="text-sm text-white/60 mb-4 leading-relaxed">
                  Arraste os cards: <span className="text-emerald-400 font-medium">direita = Bora</span>, <span className="text-red-400 font-medium">esquerda = Passo</span>.
                </p>
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startDeck()}
                  placeholder="Seu apelido (ex: Rafa)"
                  maxLength={24}
                  autoFocus
                  className="w-full rounded-2xl bg-white/[0.05] border border-white/[0.1] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#2563eb]/60 transition text-center mb-3"
                />
                {errMsg && <p className="text-[12px] text-red-400 mb-3">{errMsg}</p>}
                <motion.button whileTap={{ scale: 0.97 }} onClick={startDeck} className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition">
                  Começar a votar →
                </motion.button>
              </div>
              {totalVoters > 0 && (
                <button onClick={() => setPhase("results")} className="mt-3 text-[13px] text-white/40 hover:text-white/60 transition">Ver resultado parcial</button>
              )}
            </motion.div>
          )}

          {/* ── Deck de swipe ──────────────────────────────────── */}
          {phase === "deck" && (
            <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center">
              {saving ? (
                <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" /></div>
              ) : (
                <BoraDeck options={deckOptions} type={poll.type} onComplete={handleComplete} />
              )}
            </motion.div>
          )}

          {/* ── Resultados ─────────────────────────────────────── */}
          {phase === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {hasVoted && (
                <div className="text-center mb-4">
                  <p className="text-base font-bold text-white">Seus votos foram registrados 🎉</p>
                  <p className="text-[12px] text-white/40 mt-0.5">
                    Você deu Bora em {myVotes.length} opç{myVotes.length === 1 ? "ão" : "ões"}.
                  </p>
                </div>
              )}
              {errMsg && <p className="text-[12px] text-red-400 text-center mb-3">{errMsg}</p>}
              <PollResults poll={poll} tally={tally} totalVoters={totalVoters} isCreator={isCreator} onClosePoll={closePoll} />
              {!closed && (
                <button onClick={() => setPhase("deck")} className="w-full mt-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium text-white/60 hover:bg-white/[0.08] transition">
                  {hasVoted ? "Votar de novo" : "Votar agora"}
                </button>
              )}
              <CreateCTA />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
