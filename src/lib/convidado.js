import { daysBetween } from "./dates.js";

// Aviso discreto pro convidado criar conta: aparece a partir do 3º dia
// distinto de uso e, se for fechado, volta depois de uma semana.
export const DIAS_PRA_AVISAR = 3;
export const PAUSA_DEPOIS_DE_FECHAR = 7;

// Guarda os dias distintos em que o app foi aberto (só os últimos 10).
export function registrarDiaUso(dias = [], hoje) {
  return dias.includes(hoje) ? dias : [...dias, hoje].slice(-10);
}

export function deveAvisarConta({ logado, diasUso = [], dispensadoEm = null, hoje }) {
  if (logado || diasUso.length < DIAS_PRA_AVISAR) return false;
  return !dispensadoEm || daysBetween(dispensadoEm, hoje) >= PAUSA_DEPOIS_DE_FECHAR;
}

// Por que a conta está sendo pedida, no contexto de cada ação. Cobrança e
// Bora? funcionam sem conta; Dividir e Amigos precisam dela.
export const MOTIVOS_CONTA = {
  dividir: "Crie sua conta pra dividir contas com os amigos e ver quem deve pra quem.",
  amigos:  "Crie sua conta pra adicionar amigos.",
  guardar: "Seus dados estão só neste aparelho. Crie sua conta pra não perder e usar em outro aparelho.",
};
