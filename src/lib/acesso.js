// O que pede conta, por modo de armazenamento (lib/storage.js).
//   exemplo — mês fictício: dá pra mexer em tudo, mas adicionar dado próprio
//             (e editar saldo ou mandar a cobrança de mentira) pede conta
//   legado  — dados reais de convidado: o que já existe continua livre;
//             só ADICIONAR dado novo pede conta
//   conta   — nada pede
// Nunca pedem conta: responder Bora?, página do link de cobrança e criar Bora?.
const PEDE_CONTA = {
  adicionar:      ["exemplo", "legado"], // lançamento, conta, fixo, renda, dívida, caixinha, categoria
  editarSaldo:    ["exemplo"],
  enviarCobranca: ["exemplo"],
};

export function precisaConta(modo, acao) {
  return (PEDE_CONTA[acao] || []).includes(modo);
}
