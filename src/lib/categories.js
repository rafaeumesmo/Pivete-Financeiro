// Categorias padrão de lançamento. O usuário pode editar nome/ícone/cor e
// criar novas (SK.categorias); o `id` é estável e é o que fica gravado nos
// lançamentos, então renomear uma categoria não quebra o histórico.
export const DEFAULT_CATEGORIAS = [
  { id: "transporte",  nome: "Transporte",   icon: "🚌", cor: "#3987e5", gradient: "from-sky-600 via-cyan-600 to-teal-700" },
  { id: "assinaturas", nome: "Assinaturas",  icon: "📺", cor: "#c98500", gradient: "from-violet-700 via-purple-700 to-fuchsia-800" },
  { id: "casa",        nome: "Casa/Contas",  icon: "🏠", cor: "#d95926", gradient: "from-amber-600 via-orange-600 to-orange-700" },
  { id: "alimentacao", nome: "Alimentação",  icon: "🍽️", cor: "#199e70", gradient: "from-orange-600 via-red-600 to-rose-700" },
  { id: "lazer",       nome: "Lazer",        icon: "🎉", cor: "#d55181", gradient: "from-pink-600 via-rose-600 to-fuchsia-700" },
  { id: "dividas",     nome: "Dívidas",      icon: "💳", cor: "#e66767", gradient: "from-red-700 via-rose-800 to-red-900" },
  { id: "outros",      nome: "Outros",       icon: "📦", cor: "#7c7b76", gradient: "from-slate-600 via-slate-700 to-zinc-800" },
  { id: "renda",       nome: "Renda",        icon: "💰", cor: "#008300", gradient: "from-emerald-600 via-green-600 to-teal-700" },
];

// Ordem fixa das fatias nos gráficos — é a ordem da paleta categórica
// validada (azul, laranja, verde-água, amarelo, magenta, …) pra que fatias
// vizinhas continuem distinguíveis com daltonismo. A cor segue a categoria,
// nunca a posição no ranking.
export const CHART_ORDER = ["transporte", "casa", "alimentacao", "assinaturas", "lazer", "dividas", "outros"];

// Paleta pra categorias criadas pelo usuário (cicla pelo índice).
export const EXTRA_CATEGORY_STYLES = [
  { cor: "#9085e9", gradient: "from-indigo-600 via-violet-700 to-purple-800" },
  { cor: "#3987e5", gradient: "from-blue-600 via-sky-600 to-cyan-600" },
  { cor: "#199e70", gradient: "from-teal-600 via-emerald-600 to-green-700" },
  { cor: "#c98500", gradient: "from-yellow-600 via-amber-600 to-orange-600" },
];

const FALLBACK = { id: "outros", nome: "Outros", icon: "📦", cor: "#64748b", gradient: "from-slate-600 via-slate-700 to-zinc-800" };

export function findCategoria(categorias, id) {
  return categorias.find(c => c.id === id) || categorias.find(c => c.id === "outros") || FALLBACK;
}

