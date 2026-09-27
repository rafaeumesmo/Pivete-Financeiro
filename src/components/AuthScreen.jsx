import { useState } from "react";
import { motion } from "framer-motion";

export function AuthScreen({ onSendLink, onGoogle }) {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true); setError("");
    try {
      await onGoogle(); // redireciona pro Google; só volta aqui se der erro
    } catch (err) {
      console.error("[auth] Falha no login com Google:", err);
      setError("Não foi possível entrar com o Google, tente novamente.");
      setGoogleLoading(false);
    }
  }

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
          <div className="flex flex-col gap-3">
          {onGoogle && (
            <>
              <motion.button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl bg-[#fff] border border-black/10 text-sm font-semibold text-neutral-900 hover:bg-[#fff]/90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {googleLoading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Entrar com Google
                  </>
                )}
              </motion.button>
              <div className="flex items-center gap-3 text-[11px] text-white/25">
                <span className="flex-1 h-px bg-white/[0.08]" />ou<span className="flex-1 h-px bg-white/[0.08]" />
              </div>
            </>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
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
          </div>
        )}

        <p className="text-[11px] text-white/20 mt-6 leading-relaxed">
          Sem senha. Um link seguro é enviado pro seu email toda vez que quiser entrar.
        </p>
      </div>
    </motion.div>
  );
}
