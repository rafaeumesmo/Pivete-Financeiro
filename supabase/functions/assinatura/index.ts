// Ações da assinatura pedidas pelo app (usuário logado):
//   { acao: "assinar", card_token_id }  cria a assinatura de R$ 1,99/mês
//   { acao: "cancelar" }                cancela (vale até o fim do mês pago)
//   { acao: "atualizar" }               relê o estado no Mercado Pago
// Responde { assinatura } com a linha da tabela assinaturas.
import { admin, mp, MPError, lerAssinatura, salvarPreapproval } from "../_shared/mp.ts";
import { assinaturaAtiva, MOTIVO, PRECO_CENTAVOS } from "../_shared/assinatura.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Mensagem que dá pra mostrar pro usuário a partir do erro do Mercado Pago.
function erroMP(err: MPError) {
  const msg = JSON.stringify(err.body ?? "").toLowerCase();
  if (msg.includes("card") || msg.includes("cc_val") || msg.includes("rejected")) {
    return "O cartão foi recusado. Confira os dados ou tente outro cartão.";
  }
  return "Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(jwt ?? "");
  const user = auth?.user;
  if (!user) return json({ erro: "Entre na sua conta pra assinar." }, 401);

  const body = await req.json().catch(() => ({}));
  try {
    const atual = await lerAssinatura(user.id);

    if (body.acao === "assinar") {
      if (atual?.status === "authorized") return json({ assinatura: atual });
      if (typeof body.card_token_id !== "string" || !body.card_token_id) return json({ erro: "Cartão inválido." }, 400);
      if (!user.email) return json({ erro: "Sua conta precisa ter um e-mail pra assinar." }, 400);
      // Cancelou e ainda tem mês pago: a primeira cobrança nova fica pro fim dele.
      const inicio = assinaturaAtiva(atual) && atual?.pago_ate ? atual.pago_ate : undefined;
      const pre = await mp("POST", "/preapproval", {
        reason: MOTIVO,
        external_reference: user.id,
        payer_email: user.email,
        card_token_id: body.card_token_id,
        back_url: Deno.env.get("APP_URL") ?? "https://example.com",
        status: "authorized",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PRECO_CENTAVOS / 100,
          currency_id: "BRL",
          ...(inicio ? { start_date: inicio } : {}),
        },
      });
      return json({ assinatura: await salvarPreapproval(pre) });
    }

    if (body.acao === "cancelar") {
      if (!atual?.mp_preapproval_id || atual.status === "cancelled") return json({ assinatura: atual });
      const pre = await mp("PUT", `/preapproval/${atual.mp_preapproval_id}`, { status: "cancelled" });
      return json({ assinatura: await salvarPreapproval(pre) });
    }

    if (body.acao === "atualizar") {
      if (!atual?.mp_preapproval_id) return json({ assinatura: atual });
      const pre = await mp("GET", `/preapproval/${atual.mp_preapproval_id}`);
      return json({ assinatura: await salvarPreapproval(pre) });
    }

    return json({ erro: "Ação desconhecida." }, 400);
  } catch (err) {
    console.error("[assinatura]", err instanceof MPError ? JSON.stringify(err.body) : err);
    if (err instanceof MPError) return json({ erro: erroMP(err) }, 400);
    return json({ erro: "Algo deu errado. Tente de novo." }, 500);
  }
});
