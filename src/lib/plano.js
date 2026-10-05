// Plano grátis × Pro. Ainda não existe pagamento: com PRO_ATIVO = false nada
// muda pro usuário (todo `pode` libera e o escudo segue o limite de hoje).
//
// Princípio: nada que já é grátis deixa de ser. O Pro só limita CRIAR mais
// (quem já tem acima do limite mantém tudo) e libera recursos novos.
// Limites contam itens ATIVOS ao mesmo tempo, sem reset mensal.
//
// O plano vem da tabela `assinaturas` (supabase/policies/07_assinaturas.sql),
// que só a service role grava. Convidado é sempre grátis: Pro exige conta.

export const PRO_ATIVO = false;

export const LIMITES_GRATIS = {
  cobrancas:  3, // abertas (não arquivadas)
  bora:       3, // enquetes abertas criadas por mim
  caixinhas:  1,
  categorias: 3, // personalizadas (as padrão não contam); seletor de ícone é livre
};

// Escudos de sequência acumulados. Hoje (flag desligada) o máximo é 2 pra
// todo mundo; com o Pro ligado, grátis guarda 1 e Pro guarda 3. Quem já tem
// mais que o máximo não perde: o limite só impede de ganhar outro.
export const ESCUDOS_HOJE = 2;
export const ESCUDOS = { gratis: 1, pro: 3 };

export function temPro({ plano, logado }) {
  return !!logado && plano === "pro";
}

// pode('caixinhas', { usados: 1, plano, logado }) → { ok, limite }
// Só os limites de "criar mais" passam aqui; recurso sem limite no grátis
// libera. Recursos Pro novos usam liberado().
export function pode(recurso, { usados = 0, plano = "gratis", logado = false } = {}, { proAtivo = PRO_ATIVO } = {}) {
  const limite = LIMITES_GRATIS[recurso];
  if (!proAtivo || temPro({ plano, logado }) || limite === undefined) return { ok: true, limite: null };
  return { ok: usados < limite, limite };
}

// Se os limites do grátis valem pra essa pessoa agora. Serve pra não gastar
// rede contando (ex.: Bora? abertos no servidor) quando não vai bloquear nada.
export function limitesValem({ plano = "gratis", logado = false } = {}, { proAtivo = PRO_ATIVO } = {}) {
  return proAtivo && !temPro({ plano, logado });
}

// Recursos Pro novos (comparação de meses, exportar, simulador…): liberados
// enquanto a flag estiver desligada.
export function liberado({ plano = "gratis", logado = false } = {}, { proAtivo = PRO_ATIVO } = {}) {
  return !proAtivo || temPro({ plano, logado });
}

export function maxEscudos({ plano = "gratis", logado = false } = {}, { proAtivo = PRO_ATIVO } = {}) {
  if (!proAtivo) return ESCUDOS_HOJE;
  return temPro({ plano, logado }) ? ESCUDOS.pro : ESCUDOS.gratis;
}

// Texto do aviso quando bater no limite (só aparece com a flag ligada).
const NOMES = { cobrancas: "cobranças abertas", bora: "Bora? abertos", caixinhas: "caixinha", categorias: "categorias personalizadas" };
export function limiteTexto(recurso, limite) {
  return `No grátis dá pra ter ${limite} ${limite === 1 ? NOMES[recurso].replace(/s$/, "") : NOMES[recurso]}. O Pro libera mais — em breve.`;
}
