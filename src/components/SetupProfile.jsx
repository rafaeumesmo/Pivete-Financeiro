import { useState } from "react";
import { motion } from "framer-motion";
import { normalizeUsername } from "../lib/username";
import { useUsernameStatus } from "../hooks/useUsernameStatus.js";
import { UsernameHint } from "./UsernameHint.jsx";
import { Brand } from "./Brand.jsx";
import { AVATAR_EMOJIS } from "../config.js";


export function SetupProfile({ onCreate, onCheckUsername, localProfile }) {
  const suggestedHandle = localProfile?.handle?.replace(/^@/, "") || "";
  const [username,    setUsername]    = useState(suggestedHandle);
  const [displayName, setDisplayName] = useState(localProfile?.name || "");
  const [emoji,       setEmoji]       = useState(localProfile?.avatar || AVATAR_EMOJIS[0]);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="w-full max-w-sm bg-surface rounded-lg border border-line shadow overflow-hidden"
      >
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <p className="text-[12px] font-semibold text-fg-3 mb-0.5">Bem-vindo ao</p>
          <h2 className="text-xl font-bold text-fg leading-none">
            <Brand />{" "}
            <span className="text-fg-3 font-normal text-base">Social</span>
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <p className="text-sm text-fg-2 mb-4 leading-relaxed">
              Escolha seu username para que os amigos possam te encontrar.
            </p>
          </div>

          {/* Emoji picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-tile border border-line text-4xl flex items-center justify-center">
              {emoji}
            </div>
            <div className="grid grid-cols-8 gap-1.5 w-full">
              {AVATAR_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`text-xl py-1.5 rounded-md transition ${emoji === em ? "bg-brand/[0.06] ring-1 ring-brand" : "hover:bg-tile"}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-fg-3 mb-2">
              Username <span className="normal-case font-normal text-fg-3 tracking-normal">(somente letras, números, _)</span>
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex: rafael_s"
              autoFocus
              className={`w-full rounded-md border bg-tile px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-3 outline-none transition ${
                status === "available" ? "border-pos/30"
                : status === "taken" || status === "invalid" ? "border-neg/30"
                : "border-line focus:border-brand"
              }`}
            />
            <div className="mt-1.5"><UsernameHint status={status} value={username} /></div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-fg-3 mb-2">
              Nome de exibição <span className="normal-case font-normal text-fg-3 tracking-normal">(opcional)</span>
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Como seus amigos te conhecem"
              className="w-full rounded-md border border-line bg-tile px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-3 outline-none focus:border-brand transition"
            />
          </div>

          {error && <p className="text-[12px] text-neg px-1">{error}</p>}

          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-lg bg-brand text-sm font-semibold text-on-brand hover:bg-brand-hover transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 rounded-full border-2 border-on-brand/30 border-t-on-brand animate-spin" />
              : "Criar perfil"
            }
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
