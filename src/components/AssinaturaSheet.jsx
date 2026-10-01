import { useEffect, useRef, useState } from "react";
import { Sheet } from "./Sheet.jsx";
import { inputCls, labelCls } from "./ui.jsx";
import { formatBRL } from "../lib/money.js";
import { useTema } from "../lib/theme.js";
import { cpfValido, mascaraCpf, soDigitos } from "../lib/cpf.js";
import { PRECO_CENTAVOS } from "../lib/assinatura.js";

const MP_SDK = "https://sdk.mercadopago.com/js/v2";
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;
const PRECO = formatBRL(PRECO_CENTAVOS);

let sdkPromise = null;
function carregarSdk() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  sdkPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = MP_SDK;
    s.onload = () => resolve(window.MercadoPago);
    s.onerror = () => { sdkPromise = null; reject(new Error("sdk")); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

function dataBR(iso) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
}

const VANTAGENS = [
  ["💾", "Seus dados ficam salvos na conta, não somem ao fechar o app"],
  ["📱", "Os mesmos lançamentos em qualquer celular ou computador"],
  ["🔓", "Cancele quando quiser, direto por aqui"],
];

// Os dados do cartão são digitados em campos do próprio Mercado Pago (iframes):
// nem o app nem o nosso servidor veem o número do cartão, só um token.
function FormCartao({ onToken, enviando }) {
  const [tema] = useTema();
  const mpRef = useRef(null);
  const [pronto, setPronto] = useState(false);
  const [erroSdk, setErroSdk] = useState(false);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    const campos = [];
    carregarSdk().then((MercadoPago) => {
      if (!vivo) return;
      const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      const style = { color: tema === "claro" ? "#111114" : "#ffffff", fontSize: "14px" };
      campos.push(
        mp.fields.create("cardNumber", { placeholder: "0000 0000 0000 0000", style }).mount("mp-cardNumber"),
        mp.fields.create("expirationDate", { placeholder: "MM/AA", style }).mount("mp-expirationDate"),
        mp.fields.create("securityCode", { placeholder: "CVV", style }).mount("mp-securityCode"),
      );
      mpRef.current = mp;
      setPronto(true);
    }).catch(() => { if (vivo) setErroSdk(true); });
    return () => { vivo = false; campos.forEach((c) => { try { c.unmount(); } catch { /* já saiu */ } }); };
  }, [tema]);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) { setErro("Digite o nome como está no cartão."); return; }
    if (!cpfValido(cpf)) { setErro("CPF inválido."); return; }
    let token;
    try {
      token = await mpRef.current.fields.createCardToken({
        cardholderName: nome.trim(),
        identificationType: "CPF",
        identificationNumber: soDigitos(cpf),
      });
    } catch {
      setErro("Confira o número, a validade e o CVV do cartão.");
      return;
    }
    const msg = await onToken(token.id);
    if (msg) setErro(msg);
  }

  if (erroSdk) {
    return <p className="text-[12px] text-red-300">Não foi possível carregar o pagamento. Confira a internet e abra de novo.</p>;
  }

  const campo = `${inputCls} h-[46px] py-0 flex items-center`;
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div>
        <label className={labelCls}>Número do cartão</label>
        <div id="mp-cardNumber" className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Validade</label><div id="mp-expirationDate" className={campo} /></div>
        <div><label className={labelCls}>CVV</label><div id="mp-securityCode" className={campo} /></div>
      </div>
      <div>
        <label className={labelCls} htmlFor="mp-nome">Nome no cartão</label>
        <input id="mp-nome" className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="cc-name" placeholder="Como está impresso" />
      </div>
      <div>
        <label className={labelCls} htmlFor="mp-cpf">CPF do titular</label>
        <input id="mp-cpf" className={inputCls} value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
      </div>
      {erro && <p role="alert" className="text-[12px] text-red-300">{erro}</p>}
      <button
        type="submit"
        disabled={!pronto || enviando}
        className="mt-1 rounded-xl bg-[#2563eb] py-3 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center"
      >
        {enviando ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : `Assinar por ${PRECO}/mês`}
      </button>
      <p className="text-[11px] text-white/30 text-center leading-relaxed">
        Cobrança mensal no cartão pelo Mercado Pago. Cancele quando quiser.
      </p>
    </form>
  );
}

export function AssinaturaSheet({ assinatura: a, onClose, showToast }) {
  const [enviando, setEnviando] = useState(false);
  const row = a.assinatura;
  const autorizada = row?.status === "authorized";

  async function assinar(token) {
    setEnviando(true);
    try {
      const nova = await a.assinar(token);
      if (nova?.status === "authorized") {
        showToast("✓ Assinatura ativa! Seus dados agora ficam salvos.", "bg-emerald-600/90");
        onClose();
        return null;
      }
      return "O Mercado Pago ainda está processando. Volte aqui em alguns minutos.";
    } catch (err) {
      return err.message;
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar() {
    if (!window.confirm(`Cancelar a assinatura? Seus dados continuam salvos até ${dataBR(row?.pago_ate)}; depois disso o app volta a guardar só nesta aba.`)) return;
    setEnviando(true);
    try {
      await a.cancelar();
      showToast("Assinatura cancelada.", "bg-white/10");
    } catch (err) {
      showToast(err.message, "bg-red-600/90");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Sheet title={a.ativa ? "Sua assinatura" : `Salve seus dados por ${PRECO}/mês`} kicker="Assinatura" onClose={onClose}>
      {autorizada ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-300">Ativa · {PRECO}/mês</p>
            {row.pago_ate && <p className="text-[12px] text-white/50 mt-0.5">Próxima cobrança em {dataBR(row.pago_ate)}</p>}
          </div>
          <button type="button" onClick={cancelar} disabled={enviando} className="rounded-xl border border-red-500/25 bg-red-500/10 py-2.5 text-sm text-red-300 disabled:opacity-50">
            Cancelar assinatura
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {a.ativa && row?.pago_ate && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-200">
              Cancelada. Seus dados continuam salvos até {dataBR(row.pago_ate)}. Assine de novo pra não perder esse acesso; a próxima cobrança só vem nessa data.
            </div>
          )}
          {row?.status === "pending" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[12px] text-white/60">
              Seu último pagamento ainda está em processamento no Mercado Pago.
            </div>
          )}
          {!a.ativa && (
            <>
              <p className="text-[13px] text-white/60 leading-relaxed">
                Sem assinatura você pode usar tudo, mas os dados ficam só nesta aba e somem quando ela fecha.
              </p>
              <ul className="flex flex-col gap-2">
                {VANTAGENS.map(([icone, texto]) => (
                  <li key={texto} className="flex items-start gap-2.5 text-[13px] text-white/75"><span aria-hidden>{icone}</span>{texto}</li>
                ))}
              </ul>
            </>
          )}
          {MP_PUBLIC_KEY
            ? <FormCartao onToken={assinar} enviando={enviando} />
            : <p className="text-[12px] text-amber-300">Pagamento ainda não configurado (falta VITE_MP_PUBLIC_KEY).</p>}
        </div>
      )}
    </Sheet>
  );
}

// Faixa fina pra quem está logado sem assinatura: lembra que nada está salvo.
export function AssinaturaBanner({ onAbrir, onDispensar, desktop = false }) {
  return (
    <div className={desktop ? "flex items-center gap-3 px-10 py-2.5 bg-[#2563eb]/[0.08] border-b border-[#2563eb]/15" : "mx-5 mb-1 flex items-center gap-2 bg-[#2563eb]/10 border border-[#2563eb]/25 rounded-xl px-3.5 py-2.5"}>
      <span className="text-sm flex-shrink-0" aria-hidden>💾</span>
      <p className="text-[12px] text-blue-200 flex-1 leading-snug">Seus dados não estão sendo salvos. Assine por <strong>{PRECO}/mês</strong> pra guardar na sua conta.</p>
      <button type="button" onClick={onAbrir} className="text-[12px] font-semibold text-blue-300 hover:text-blue-200 whitespace-nowrap">Assinar</button>
      <button type="button" onClick={onDispensar} aria-label="Dispensar aviso" className="text-blue-300/40 hover:text-blue-300 transition text-sm flex-shrink-0">✕</button>
    </div>
  );
}
