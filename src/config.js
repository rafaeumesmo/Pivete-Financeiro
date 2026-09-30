// Nome provisório do app. Único lugar a mudar quando o nome definitivo sair:
// todo texto de marca (cabeçalho, onboarding, links compartilhados, título da
// aba) lê daqui.
export const APP_NAME = "Pivete Financeiro";
export const APP_TAGLINE = "Seu dinheiro, um swipe por vez.";
export const BRAND_COLOR = "#2563eb";

// Divide o nome no segundo maiúsculo pra destacar a segunda parte
// ("Pivete " + "Financeiro"). Nome sem segundo maiúsculo sai inteiro na 1ª parte.
export function brandParts(name = APP_NAME) {
  const i = name.slice(1).search(/[A-Z]/);
  return i === -1 ? [name, ""] : [name.slice(0, i + 1), name.slice(i + 1)];
}
