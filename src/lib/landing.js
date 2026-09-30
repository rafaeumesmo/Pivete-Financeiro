// Quem vê a Landing: todo visitante sem login (os dados sem conta só vivem na
// aba, então quem volta começa do zero) e quem acabou de sair da conta.
// jaNoApp: tem sessão salva no aparelho ou já passou da Landing nesta aba —
// vai direto pro app, sem esperar a sessão (não depende de rede).

// session: undefined = ainda carregando, null = sem login, objeto = logado.
// → "app" | "landing" | "carregando" (fundo vazio, sem flash de conteúdo)
export function telaInicial({ session, jaNoApp, saiu = false }) {
  if (jaNoApp && !saiu) return "app";
  if (session === undefined) return "carregando";
  return session ? "app" : "landing";
}
