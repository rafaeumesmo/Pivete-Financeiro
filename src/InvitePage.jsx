import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "./supabaseClient";
import { APP_NAME } from "./config.js";

function decodeInvite(hash) {
  try {
    const s = hash.replace(/^#\/invite\//, "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = s.length % 4 ? s + "=".repeat(4 - s.length % 4) : s;
    return JSON.parse(decodeURIComponent(atob(padded)));
  } catch {
    return null;
  }
}

// Registra a resposta em invite_link_responses (ver supabase/schema.sql) pra
// que quem enviou o convite consiga ver, em "Convites enviados", quantas
// pessoas responderam pelo link — sem isso a resposta ficava só na tela de
// quem clicou e nunca voltava pro organizador.
async function recordInviteResponse(inviteId, decision) {
  if (!supabase || !inviteId) return false;
  const { error } = await supabase.from("invite_link_responses").insert({ invite_id: String(inviteId), decision });
  return !error;
}

export default function InvitePage() {
  const [invite, setInvite] = useState(null);
  const [decision, setDecision] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [delivered, setDelivered] = useState(false);

  useEffect(() => {
    const data = decodeInvite(window.location.hash);
    if (!data) setInvalid(true);
    else setInvite(data);
  }, []);

  async function handleDecision(value) {
    setDecision(value);
    const ok = await recordInviteResponse(invite?.id, value);
    setDelivered(ok);
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-[#111114] flex flex-col items-center justify-center px-4 gap-3">
        <div className="text-5xl">🔗</div>
        <p className="text-white/50 text-sm text-center">Link inválido ou expirado.</p>
      </div>
    );
  }

  if (!invite) return null;

  if (decision) {
    const accepted = decision === "accepted";
    return (
      <div className="min-h-screen bg-[#111114] flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="text-center"
        >
          <div className="text-7xl mb-5">{accepted ? "✅" : "❌"}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {accepted ? "Tarefa aceita!" : "Tarefa recusada."}
          </h2>
          <p className="text-sm text-white/40 max-w-xs">
            {delivered
              ? (accepted ? "Boa! O organizador vai ver que você topou." : "Tudo bem. O organizador vai ver que você não pode.")
              : "Sua resposta foi registrada neste dispositivo, mas não foi possível avisar o organizador agora (sem conexão). Se puder, avise por fora."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111114] flex flex-col items-center justify-center px-4 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-1.5">
          {APP_NAME}
        </p>
        <h1 className="text-xl font-bold text-white">Você foi convidado</h1>
        <p className="text-sm text-white/35 mt-1">Aceite ou recuse esta tarefa</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.08, type: "spring", stiffness: 240, damping: 24 }}
        className="w-full max-w-sm mb-8"
      >
        <div
          className={`w-full rounded-3xl bg-gradient-to-br ${invite.gradient} overflow-hidden shadow-2xl relative`}
          style={{ aspectRatio: "3/4" }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-5 left-5 z-10">
            <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">
              {invite.category}
            </span>
          </div>
          <div className="absolute top-5 right-5 z-10 text-4xl filter drop-shadow-lg">
            {invite.emoji}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2 leading-tight">
              {invite.title}
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">{invite.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="flex gap-4 w-full max-w-sm"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDecision("declined")}
          className="flex-1 py-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 font-semibold text-sm hover:bg-red-500/20 transition-colors"
        >
          ✕ Recusar
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDecision("accepted")}
          className="flex-1 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold text-sm hover:bg-emerald-500/20 transition-colors"
        >
          ✓ Aceitar
        </motion.button>
      </motion.div>

      <p className="text-[10px] text-white/15 mt-10 tracking-wider">TASKMATCH</p>
    </div>
  );
}
