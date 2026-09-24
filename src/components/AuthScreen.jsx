import { useState } from "react";
import { motion } from "framer-motion";

export function AuthScreen({ onSendLink }) {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      await onSendLink(email.trim());
      setSent(true);
    } catch (err) {
      // Mensagem amigável em vez do erro cru do Supabase.
      console.error("[auth] Falha no magic link:", err);
      setError("Não foi possível entrar, tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 pb-6 text-center"
    >
      <div className="w-full max-w-sm">
        <div className="text-4xl mb-3">🌐</div>
        <p className="text-sm text-white/40 mb-6 leading-relaxed">
          Compartilhe tasks com amigos e veja o que eles estão decidindo em tempo real.
        </p>

        {sent ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6">
            <div className="text-3xl mb-3">📬</div>
            <p className="text-sm font-semibold text-emerald-300 mb-1">Link enviado!</p>
            <p className="text-[13px] text-white/40">
              Verifique seu email <span className="text-white/70 font-medium">{email}</span> e clique no link para entrar.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-[12px] text-white/30 hover:text-white/50 transition"
            >
              Usar outro email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
              autoFocus
            />
            {error && <p className="text-[12px] text-red-400 text-left px-1">{error}</p>}
            <motion.button
              type="submit"
              disabled={loading || !email.trim()}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>Enviar magic link ✉️</>
              )}
            </motion.button>
          </form>
        )}

        <p className="text-[11px] text-white/20 mt-6 leading-relaxed">
          Sem senha. Um link seguro é enviado pro seu email toda vez que quiser entrar.
        </p>
      </div>
    </motion.div>
  );
}
