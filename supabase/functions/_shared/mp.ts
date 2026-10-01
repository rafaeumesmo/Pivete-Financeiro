// Mercado Pago + Supabase (service role) pras Edge Functions de assinatura.
// Variáveis (Dashboard → Edge Functions → Secrets, ou `supabase secrets set`):
//   MP_ACCESS_TOKEN     — Access Token do Mercado Pago (TEST-… pra testar)
//   MP_WEBHOOK_SECRET   — "assinatura secreta" do webhook no painel do MP
//   APP_URL             — endereço do app (volta do Mercado Pago)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY o Supabase já injeta sozinho.
import { createClient } from "npm:@supabase/supabase-js@2";
import { linhaDaPreapproval } from "./assinatura.js";

const MP_API = "https://api.mercadopago.com";

export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

export class MPError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Mercado Pago respondeu ${status}`);
  }
}

export async function mp(method: string, path: string, body?: unknown) {
  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { "X-Idempotency-Key": crypto.randomUUID() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new MPError(res.status, data);
  return data;
}

export async function lerAssinatura(userId: string) {
  const { data, error } = await admin.from("assinaturas").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// Grava o estado que o Mercado Pago informou. A preapproval só vale pro dono
// dela (external_reference = id do usuário, definido ao criar).
export async function salvarPreapproval(pre: { id: string; external_reference?: string }) {
  const userId = pre.external_reference;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const anterior = await lerAssinatura(userId);
  // Uma assinatura antiga (cancelada) não sobrescreve a atual.
  if (anterior?.mp_preapproval_id && anterior.mp_preapproval_id !== String(pre.id) && anterior.status === "authorized") {
    return anterior;
  }
  const row = {
    user_id: userId,
    ...linhaDaPreapproval(pre, anterior),
    atualizado_em: new Date().toISOString(),
  };
  const { data, error } = await admin.from("assinaturas").upsert(row, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return data;
}
