// Quem vê a Landing: visitante novo (sem login e sem ter clicado "Começar
// agora") e quem acabou de sair da conta. Convidado que volta vai direto pro
// app: os dados dele ficam no aparelho.
// jaNoApp: tem sessão salva no aparelho ou já passou da Landing como
// convidado — vai direto pro app, sem esperar a sessão (não depende de rede).

// session: undefined = ainda carregando, null = sem login, objeto = logado.
// → "app" | "landing" | "carregando" (fundo vazio, sem flash de conteúdo)
export function telaInicial({ session, jaNoApp, saiu = false }) {
  if (jaNoApp && !saiu) return "app";
  if (session === undefined) return "carregando";
  return session ? "app" : "landing";
}
