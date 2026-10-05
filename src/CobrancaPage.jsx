import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CircleCheck, Copy, Link2Off, WifiOff } from "lucide-react";
import { supabase } from "./supabaseClient";
import { Brand } from "./components/Brand.jsx";
import { btnCls, inputCls, labelCls } from "./components/ui.jsx";
import { decodePayload } from "./hooks/useCobrancas.js";
import { formatBRL } from "./lib/money.js";
import { ICON_STROKE } from "./lib/icons.js";

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
      <div className="min-h-[100dvh] bg-page flex flex-col items-center justify-center px-4 gap-3 text-center">
        <span className="w-12 h-12 rounded-md bg-tile text-fg-2 flex items-center justify-center" aria-hidden><Link2Off size={24} strokeWidth={ICON_STROKE} /></span>
        <p className="text-[15px] font-semibold text-fg">Esse link de cobrança não rolou</p>
        <p className="text-sm text-fg-2 max-w-xs">Pode ter sido cortado no meio. Pede pra quem te mandou enviar de novo.</p>
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

  const quem = charge.de || "Quem te cobrou";

  return (
    <div className="min-h-[100dvh] bg-page flex flex-col items-center justify-center px-4 py-10" style={{ paddingTop: "max(env(safe-area-inset-top), 40px)" }}>
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 max-w-sm">
        <p className="text-[13px] font-medium text-fg-2 mb-1">Cobrança</p>
        <h1 className="text-xl font-bold text-fg text-balance">{charge.de ? `${charge.de} rachou uma conta com você` : "Racharam uma conta com você"}</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.08, type: "spring", stiffness: 240, damping: 24 }}
        className="w-full max-w-sm rounded-lg bg-brand text-on-brand p-6 shadow mb-6 text-center">
        <p className="text-sm opacity-80 mb-3 truncate">{charge.titulo}</p>
        <p className="text-[13px] opacity-70">Sua parte</p>
        <p className="text-[44px] font-bold tracking-tight tabular-nums leading-tight">{formatBRL(charge.porPessoa)}</p>
        {charge.partes > 1 && <p className="text-[13px] opacity-70">dividido entre {charge.partes} pessoas</p>}
        {charge.pix && (
          <button type="button" onClick={copiarPix} className="mt-5 w-full rounded-md bg-black/20 px-4 py-3 text-left hover:bg-black/30 transition">
            <span className="block text-[12px] opacity-70">Chave Pix</span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{charge.pix}</span>
              <span className="text-[13px] font-medium flex-shrink-0 inline-flex items-center gap-1">
                {copied ? <><Check size={14} strokeWidth={ICON_STROKE} aria-hidden />Copiada</> : <><Copy size={14} strokeWidth={ICON_STROKE} aria-hidden />Copiar</>}
              </span>
            </span>
          </button>
        )}
      </motion.div>

      <div className="w-full max-w-sm">
        {status === "done" || status === "offline" ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center rounded-lg bg-surface border border-line p-6">
            <span className={`mx-auto mb-3 w-12 h-12 rounded-md bg-tile flex items-center justify-center ${status === "done" ? "text-pos" : "text-warn"}`} aria-hidden>
              {status === "done" ? <CircleCheck size={24} strokeWidth={ICON_STROKE} /> : <WifiOff size={24} strokeWidth={ICON_STROKE} />}
            </span>
            <p className="text-[17px] font-semibold text-fg mb-1">{status === "done" ? "Avisado!" : "Marcado aqui, mas sem aviso"}</p>
            <p className="text-sm text-fg-2">{status === "done" ? `${quem} vai ver que você pagou.` : "Tá sem internet, então o aviso não foi. Manda uma mensagem dizendo que pagou."}</p>
          </motion.div>
        ) : (
          <div className="flex flex-col">
            <label htmlFor="nome" className={labelCls}>Seu nome</label>
            <input id="nome" value={nome} maxLength={40} onChange={e => setNome(e.target.value)} placeholder="Como te chamam" className={inputCls} />
            <button type="button" disabled={!nome.trim() || status === "sending"} onClick={marcarPago}
              className={`${btnCls.primary} w-full py-3.5 text-sm mt-3`}>
              {status === "sending" ? "Enviando…" : <><Check size={16} strokeWidth={ICON_STROKE} aria-hidden />Já paguei</>}
            </button>
            <p className="text-[12px] text-fg-3 text-center mt-3 leading-relaxed">O pagamento é por fora (Pix, dinheiro…). Aqui você só avisa que já pagou. Não precisa criar conta.</p>
          </div>
        )}
      </div>

      <a href={`${window.location.origin}${window.location.pathname}`} className="mt-10 text-[12px] text-fg-3 hover:text-fg-2 transition text-center">
        feito no <span className="font-semibold"><Brand /></span> · organiza as suas contas também
      </a>
    </div>
  );
}
