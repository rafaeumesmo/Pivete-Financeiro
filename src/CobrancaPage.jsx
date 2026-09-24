import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "./supabaseClient";
import { APP_NAME } from "./config.js";
import { Brand } from "./components/Brand.jsx";
import { decodePayload } from "./hooks/useCobrancas.js";
import { formatBRL } from "./lib/money.js";

// Página pública do link de cobrança (#/cobranca/<payload>) — é o antigo
// convite por link reaproveitado. Quem abre não precisa de conta: vê quanto
// deve e marca "Paguei"; o aviso vai pra charge_payments (ver
// supabase/policies/02_charges.sql) e aparece pra quem cobrou em Social →
// Cobranças.

function readCharge() {
  const raw = window.location.hash.replace(/^#\/cobranca\//, "");
  const c = decodePayload(raw);
  if (!c || typeof c.id !== "string" || !Number.isInteger(c.p) || c.p <= 0) return null;
  return { id: c.id, titulo: String(c.t || "Conta dividida").slice(0, 80), porPessoa: c.p, partes: c.n, de: String(c.de || "").slice(0, 40), pix: c.pix ? String(c.pix).slice(0, 100) : null };
}

const doneKey = (id) => `fin_cobranca_paga_${id}`;

export default function CobrancaPage() {
  const [charge] = useState(readCharge);
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState(() => {
    try { return charge && localStorage.getItem(doneKey(charge.id)) ? "done" : "idle"; } catch { return "idle"; }
  }); // idle | sending | done | offline
  const [copied, setCopied] = useState(false);

  if (!charge) {
    return (
      <div className="min-h-screen bg-[#111114] flex flex-col items-center justify-center px-4 gap-3">
        <div className="text-5xl">🔗</div>
        <p className="text-white/50 text-sm text-center">Link de cobrança inválido.</p>
      </div>
    );
  }

  async function marcarPago() {
    if (!nome.trim()) return;
    setStatus("sending");
    let ok = false;
    if (supabase) {
      const { error } = await supabase.from("charge_payments").insert({ charge_id: charge.id, payer_name: nome.trim().slice(0, 40) });
      ok = !error;
    }
    try { localStorage.setItem(doneKey(charge.id), "1"); } catch {}
    setStatus(ok ? "done" : "offline");
  }

  async function copiarPix() {
    try { await navigator.clipboard.writeText(charge.pix); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  return (
    <div className="min-h-screen bg-[#111114] flex flex-col items-center justify-center px-4 py-10" style={{ paddingTop: "max(env(safe-area-inset-top), 40px)" }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-1.5">Cobrança</p>
        <h1 className="text-xl font-bold text-white">{charge.de ? `${charge.de} dividiu uma conta com você` : "Dividiram uma conta com você"}</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.08, type: "spring", stiffness: 240, damping: 24 }}
        className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 p-6 shadow-2xl mb-6 text-center">
        <p className="text-sm text-white/70 mb-1 truncate">{charge.titulo}</p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Sua parte</p>
        <p className="text-[44px] font-black text-white tabular-nums leading-tight">{formatBRL(charge.porPessoa)}</p>
        {charge.partes > 1 && <p className="text-[12px] text-white/55">dividido entre {charge.partes} pessoas</p>}
        {charge.pix && (
          <button type="button" onClick={copiarPix} className="mt-4 w-full rounded-2xl bg-black/25 border border-white/15 px-4 py-3 text-left hover:bg-black/35 transition">
            <span className="block text-[10px] uppercase tracking-widest text-white/50">Chave Pix</span>
            <span className="flex items-center justify-between gap-2"><span className="text-sm text-white font-medium truncate">{charge.pix}</span><span className="text-[11px] text-white/70 flex-shrink-0">{copied ? "✓ Copiada" : "Copiar"}</span></span>
          </button>
        )}
      </motion.div>

      <div className="w-full max-w-sm">
        {status === "done" || status === "offline" ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="text-6xl mb-3">✅</div>
            <p className="text-lg font-bold text-white mb-1">Marcado como pago</p>
            <p className="text-sm text-white/45">{status === "done" ? `${charge.de || "Quem te cobrou"} vai ver o seu aviso.` : "Não deu pra avisar agora (sem conexão). Avise por mensagem que você pagou."}</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <label htmlFor="nome" className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35">Seu nome</label>
            <input id="nome" value={nome} maxLength={40} onChange={e => setNome(e.target.value)} placeholder="Como te chamam" className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25" />
            <motion.button whileTap={{ scale: 0.97 }} disabled={!nome.trim() || status === "sending"} onClick={marcarPago}
              className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition disabled:opacity-40">
              {status === "sending" ? "Enviando…" : "✓ Já paguei"}
            </motion.button>
            <p className="text-[11px] text-white/25 text-center">O pagamento é feito por fora (Pix, dinheiro…). Aqui você só avisa. Não precisa criar conta.</p>
          </div>
        )}
      </div>

      <a href={`${window.location.origin}${window.location.pathname}`} className="mt-10 text-[11px] text-white/25 hover:text-white/50 transition">feito no <span className="font-bold"><Brand /></span> · organize suas contas no {APP_NAME}</a>
    </div>
  );
}
