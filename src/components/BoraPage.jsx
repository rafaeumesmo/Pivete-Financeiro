import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePoll } from "../hooks/usePoll.js";
import { PollResults } from "./PollResults.jsx";
import { BoraDeck } from "./BoraDeck.jsx";
import { BoraTournament } from "./BoraTournament.jsx";
import { getNick, setNick as persistNick } from "../lib/anon";
import { Brand } from "./Brand.jsx";
import { APP_NAME } from "../config.js";
import { Link2Off, WifiOff, CircleHelp, Swords, Hand } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { btnCls, inputCls } from "./ui.jsx";

function getPollId() {
  const m = window.location.hash.match(/^#\/bora\/([^/?]+)/);
  return m ? m[1] : null;
}

function Shell({ children }) {
  return (
    <div
      className="min-h-screen bg-page flex flex-col items-center px-4"
      style={{ paddingTop: "max(env(safe-area-inset-top), 20px)", paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
    >
      <div className="w-full max-w-md flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function Branding() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-4 flex-shrink-0">
      <span className="text-[12px] text-fg-3">feito no</span>
      <span className="text-sm font-bold text-fg"><Brand icon /></span>
    </div>
  );
}

function CreateCTA() {
  return (
    <a
      href={`${window.location.origin}${window.location.pathname}`}
      className="mt-6 block rounded-lg px-5 py-4 text-center bg-surface border border-line hover:bg-tile transition"
    >
      <p className="text-sm font-semibold text-fg">Gostou? Crie seu Bora no {APP_NAME}</p>
      <p className="text-[12px] text-fg-2 mt-0.5">Decisões em grupo no swipe — de graça, sem complicação.</p>
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
    () => options.map((o) => ({ id: o.id, emoji: o.emoji, label: o.label })),
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
    return <Shell><Branding /><div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin" /></div></Shell>;
  }
  if (error === "notfound" || (!poll && error !== "network" && error !== "load" && error !== "config")) {
    return <Shell><Branding /><div className="flex-1 flex flex-col items-center justify-center text-center gap-3"><span className="w-12 h-12 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><Link2Off size={24} strokeWidth={ICON_STROKE} /></span><p className="text-fg-2 text-sm">Enquete não encontrada ou link inválido.</p><CreateCTA /></div></Shell>;
  }
  if (error === "config" || error === "network" || error === "load") {
    return <Shell><Branding /><div className="flex-1 flex flex-col items-center justify-center text-center gap-3"><span className="w-12 h-12 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><WifiOff size={24} strokeWidth={ICON_STROKE} /></span><p className="text-fg-2 text-sm">Não foi possível carregar a enquete.</p><p className="text-fg-3 text-xs">Verifique sua conexão e tente novamente.</p><button onClick={() => window.location.reload()} className={`${btnCls.secondary} mt-2 px-4 py-2 text-sm`}>Tentar novamente</button></div></Shell>;
  }
  if (options.length === 0) {
    return <Shell><Branding /><div className="flex-1 flex flex-col items-center justify-center text-center gap-3"><span className="w-12 h-12 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><CircleHelp size={24} strokeWidth={ICON_STROKE} /></span><p className="text-fg-2 text-sm">Essa enquete não tem opções.</p><CreateCTA /></div></Shell>;
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
        {closed && <span className="inline-block text-[12px] font-medium text-fg-2 bg-tile px-2 py-0.5 rounded-sm mb-3">Encerrada</span>}
        <h1 className="text-[24px] font-semibold text-fg leading-tight">{poll.title}</h1>
        {phase === "deck" && (
          <p className="text-[13px] text-fg-3 mt-1.5">
            {poll.type === "single" ? "Duelo de cards" : "Arrasta os cards"} · você é {nick.trim() || "anônimo"}
          </p>
        )}
        {phase === "intro" && (
          <p className="text-[13px] text-fg-3 mt-1.5">
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
              <div className="rounded-lg border border-line bg-surface p-6 text-center">
                <span className="mx-auto mb-3 w-12 h-12 rounded-md bg-tile text-fg flex items-center justify-center" aria-hidden>{poll.type === "single" ? <Swords size={24} strokeWidth={ICON_STROKE} /> : <Hand size={24} strokeWidth={ICON_STROKE} />}</span>
                <p className="text-sm text-fg-2 mb-4 leading-relaxed">
                  {poll.type === "single" ? (
                    <>As opções se enfrentam em duelos. <span className="text-pos font-medium">Toque na sua favorita</span> até sobrar uma campeã.</>
                  ) : (
                    <>Arraste os cards: <span className="text-pos font-medium">direita = Bora</span>, <span className="text-neg font-medium">esquerda = Passo</span>.</>
                  )}
                </p>
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startDeck()}
                  placeholder="Seu apelido (ex: Rafa)"
                  maxLength={24}
                  autoFocus
                  className={`${inputCls} text-center mb-3`}
                />
                {errMsg && <p className="text-[12px] text-neg mb-3">{errMsg}</p>}
                <motion.button whileTap={{ scale: 0.97 }} onClick={startDeck} className="w-full py-3.5 rounded-lg bg-brand text-sm font-semibold text-on-brand hover:bg-brand-hover transition">
                  Começar a votar
                </motion.button>
              </div>
              {totalVoters > 0 && (
                <button onClick={() => setPhase("results")} className="mt-3 text-[13px] text-fg-2 hover:text-fg-2 transition">Ver resultado parcial</button>
              )}
            </motion.div>
          )}

          {/* ── Deck de swipe ──────────────────────────────────── */}
          {phase === "deck" && (
            <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col justify-center">
              {saving ? (
                <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin" /></div>
              ) : poll.type === "single" ? (
                <BoraTournament options={deckOptions} onChampion={(id) => handleComplete([id])} />
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
                  <p className="text-base font-semibold text-fg">Seus votos foram registrados</p>
                  <p className="text-[12px] text-fg-2 mt-0.5">
                    Você deu Bora em {myVotes.length} opç{myVotes.length === 1 ? "ão" : "ões"}.
                  </p>
                </div>
              )}
              {errMsg && <p className="text-[12px] text-neg text-center mb-3">{errMsg}</p>}
              <PollResults poll={poll} tally={tally} totalVoters={totalVoters} isCreator={isCreator} onClosePoll={closePoll} />
              {!closed && (
                <button onClick={() => setPhase("deck")} className={`${btnCls.secondary} w-full mt-3 py-2.5 text-sm`}>
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
