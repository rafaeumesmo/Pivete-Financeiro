// Webhook do Mercado Pago (Painel do MP → Suas integrações → Webhooks).
// Eventos: "Planos e assinaturas" (subscription_preapproval e
// subscription_authorized_payment). Publicar SEM verificação de JWT:
//   supabase functions deploy mp-webhook --no-verify-jwt
//
// Não confia no corpo da notificação: com o id em mãos, relê a assinatura na
// API do Mercado Pago e grava o que ela disser.
import { mp, salvarPreapproval } from "../_shared/mp.ts";
import { lerXSignature, manifestoWebhook } from "../_shared/assinatura.js";

async function hmacHex(segredo: string, texto: string) {
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const tipo = url.searchParams.get("type") ?? body.type ?? url.searchParams.get("topic") ?? body.topic;
  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? url.searchParams.get("id");
  if (!dataId) return new Response("ok");

  const segredo = Deno.env.get("MP_WEBHOOK_SECRET");
  if (segredo) {
    const sig = lerXSignature(req.headers.get("x-signature"));
    const manifesto = sig && manifestoWebhook({ dataId, requestId: req.headers.get("x-request-id"), ts: sig.ts });
    if (!sig || !iguais(await hmacHex(segredo, manifesto!), sig.v1)) {
      return new Response("assinatura inválida", { status: 401 });
    }
  }

  try {
    let preapprovalId: string | null = null;
    if (tipo === "subscription_preapproval" || tipo === "preapproval") preapprovalId = String(dataId);
    else if (tipo === "subscription_authorized_payment" || tipo === "authorized_payment") {
      const pagamento = await mp("GET", `/authorized_payments/${dataId}`);
      preapprovalId = pagamento?.preapproval_id ?? null;
    }
    if (preapprovalId) await salvarPreapproval(await mp("GET", `/preapproval/${preapprovalId}`));
    return new Response("ok");
  } catch (err) {
    // 500 faz o Mercado Pago reenviar mais tarde.
    console.error("[mp-webhook]", err);
    return new Response("erro", { status: 500 });
  }
});
