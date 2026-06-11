import { useState } from "react";
import { motion } from "framer-motion";
import { normalizeUsername } from "../lib/username";
import { useUsernameStatus } from "../hooks/useUsernameStatus.js";
import { UsernameHint } from "./UsernameHint.jsx";

const EMOJIS = ["😎","🚀","⚡","🎯","🔥","💡","🧠","🏆","🎮","🦊","🐼","🌟","🎸","🎪","🌈","🍕"];

export function SetupProfile({ onCreate, onCheckUsername, localProfile }) {
  const suggestedHandle = localProfile?.handle?.replace(/^@/, "") || "";
  const [username,    setUsername]    = useState(suggestedHandle);
  const [displayName, setDisplayName] = useState(localProfile?.name || "");
  const [emoji,       setEmoji]       = useState(localProfile?.avatar || "😎");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const status   = useUsernameStatus(username, onCheckUsername);
  const canSubmit = status === "available" && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (status !== "available") return;
    setLoading(true); setError("");
    try {
      await onCreate({ username: u, displayName: displayName || u, avatarEmoji: emoji });
    } catch (err) {
      setError(err.code === "23505" || err.message?.includes("duplicate") || err.message?.includes("unique")
        ? "Esse username acabou de ser usado, tente outro."
        : err.message || "Erro ao criar perfil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="w-full max-w-sm bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">Bem-vindo ao</p>
          <h2 className="text-xl font-black text-white leading-none">
            Task<span style={{ color: "#2563eb" }}>Match</span>{" "}
            <span className="text-white/30 font-normal text-base">Social</span>
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-sm text-white/60 mb-4 leading-relaxed">
              Escolha seu username para que os amigos possam te encontrar.
            </p>
          </div>

          {/* Emoji picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/[0.07] border border-white/10 text-4xl flex items-center justify-center">
              {emoji}
            </div>
            <div className="grid grid-cols-8 gap-1.5 w-full">
              {EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`text-xl py-1.5 rounded-xl transition ${emoji === em ? "bg-[#2563eb]/30 ring-1 ring-[#2563eb]" : "hover:bg-white/[0.06]"}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">
              Username <span className="normal-case font-normal text-white/20 tracking-normal">(somente letras, números, _)</span>
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: rafael_s"
              autoFocus
              className={`w-full rounded-xl border bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition ${
                status === "available" ? "border-emerald-500/50"
                : status === "taken" || status === "invalid" ? "border-red-500/50"
                : "border-white/[0.08] focus:border-[#2563eb]/60"
              }`}
            />
            <div className="mt-1.5"><UsernameHint status={status} value={username} /></div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/35 mb-2">
              Nome de exibição <span className="normal-case font-normal text-white/20 tracking-normal">(opcional)</span>
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Como seus amigos te conhecem"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
            />
          </div>

          {error && <p className="text-[12px] text-red-400 px-1">{error}</p>}

          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : "Criar perfil →"
            }
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
