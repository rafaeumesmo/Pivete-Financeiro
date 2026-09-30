// Quem vê a Landing: só o visitante "zerado" — sem sessão do Supabase e sem
// nenhuma chave fin_* neste aparelho. Quem já usa o app em modo local nunca é
// barrado, e com dados locais nem esperamos a sessão (não depende de rede).

export function temDadosLocais(storage = globalThis.localStorage) {
  try {
    for (let i = 0; i < storage.length; i++) {
      if (storage.key(i)?.startsWith("fin_")) return true;
    }
  } catch { /* storage bloqueado (modo privado): trata como vazio */ }
  return false;
}

// session: undefined = ainda carregando, null = sem login, objeto = logado.
// → "app" | "landing" | "carregando" (fundo vazio, sem flash de conteúdo)
export function telaInicial({ session, temDados }) {
  if (temDados) return "app";
  if (session === undefined) return "carregando";
  return session ? "app" : "landing";
}
