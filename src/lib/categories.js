// Categorias padrão de lançamento. O usuário pode editar nome/ícone/cor e
// criar novas (SK.categorias); o `id` é estável e é o que fica gravado nos
// lançamentos, então renomear uma categoria não quebra o histórico.
export const DEFAULT_CATEGORIAS = [
  { id: "transporte",  nome: "Transporte",   icon: "🚌", cor: "#0ea5e9", gradient: "from-sky-600 via-cyan-600 to-teal-700" },
  { id: "assinaturas", nome: "Assinaturas",  icon: "📺", cor: "#a855f7", gradient: "from-violet-700 via-purple-700 to-fuchsia-800" },
  { id: "casa",        nome: "Casa/Contas",  icon: "🏠", cor: "#f59e0b", gradient: "from-amber-600 via-orange-600 to-orange-700" },
  { id: "alimentacao", nome: "Alimentação",  icon: "🍽️", cor: "#ef4444", gradient: "from-orange-600 via-red-600 to-rose-700" },
  { id: "lazer",       nome: "Lazer",        icon: "🎉", cor: "#ec4899", gradient: "from-pink-600 via-rose-600 to-fuchsia-700" },
  { id: "dividas",     nome: "Dívidas",      icon: "💳", cor: "#dc2626", gradient: "from-red-700 via-rose-800 to-red-900" },
  { id: "renda",       nome: "Renda",        icon: "💰", cor: "#10b981", gradient: "from-emerald-600 via-green-600 to-teal-700" },
  { id: "outros",      nome: "Outros",       icon: "📦", cor: "#64748b", gradient: "from-slate-600 via-slate-700 to-zinc-800" },
];

// Paleta pra categorias criadas pelo usuário (cicla pelo índice).
export const EXTRA_CATEGORY_STYLES = [
  { cor: "#3b82f6", gradient: "from-blue-600 via-sky-600 to-cyan-600" },
  { cor: "#14b8a6", gradient: "from-teal-600 via-emerald-600 to-green-700" },
  { cor: "#eab308", gradient: "from-yellow-600 via-amber-600 to-orange-600" },
  { cor: "#6366f1", gradient: "from-indigo-600 via-violet-700 to-purple-800" },
];

const FALLBACK = { id: "outros", nome: "Outros", icon: "📦", cor: "#64748b", gradient: "from-slate-600 via-slate-700 to-zinc-800" };

export function findCategoria(categorias, id) {
  return categorias.find(c => c.id === id) || categorias.find(c => c.id === "outros") || FALLBACK;
}

// LEGADO (app de tarefas): ainda usado pela tela Criar até a Etapa 2.
export const ONBOARDING_GRADIENTS = {
  Alimentação: { gradient: "from-orange-600 via-red-600 to-rose-700",    accent: "#f97316" },
  Lazer:       { gradient: "from-violet-700 via-purple-700 to-indigo-800", accent: "#8b5cf6" },
  Saúde:       { gradient: "from-emerald-600 via-teal-600 to-cyan-700",   accent: "#10b981" },
  Estudos:     { gradient: "from-blue-600 via-sky-600 to-cyan-600",       accent: "#3b82f6" },
  Trabalho:    { gradient: "from-amber-600 via-yellow-600 to-orange-500", accent: "#f59e0b" },
};
