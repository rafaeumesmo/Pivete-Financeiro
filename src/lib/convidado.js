// Por que a conta está sendo pedida, no contexto de cada ação. Cobrança e
// Bora? funcionam sem conta; Dividir e Amigos precisam dela. Sem conta, quem
// está no mês de exemplo (ou com dados de convidado antigos) ouve "comecar"
// ao tentar adicionar dado próprio (lib/acesso.js).
export const MOTIVOS_CONTA = {
  comecar: "Crie sua conta pra começar com os seus dados.",
  dividir: "Crie sua conta pra dividir contas com os amigos e ver quem deve pra quem.",
  amigos:  "Crie sua conta pra adicionar amigos.",
  guardar: "Seus dados estão só neste aparelho. Crie sua conta pra não perder e usar em outro aparelho.",
};
