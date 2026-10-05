import {
  Bus, Tv, House, Utensils, PartyPopper, CreditCard, Package, Wallet, Tag,
  Car, Fuel, ShoppingCart, ShoppingBag, Coffee, Gift, Heart, HeartPulse, Pill,
  GraduationCap, BookOpen, Dumbbell, Plane, Shirt, Smartphone, Wifi, Zap,
  Droplets, PawPrint, Baby, Gamepad2, Music, Film, Wrench, Briefcase, PiggyBank,
  Landmark, Receipt, Banknote, TrendingUp,
  FilePen, CircleCheck, Timer, Flame, Scissors, Trophy, LifeBuoy, Castle,
} from "lucide-react";

// Ícones da interface (lucide-react). Emojis ficam só em conteúdo digitado
// pelo usuário (avatar, enquete).
export const ICON_STROKE = 1.75;

// Ícones que o usuário pode escolher pra uma categoria. A chave é o que fica
// gravado em `categoria.iconKey` — nunca renomeie uma chave existente.
export const ICONS = {
  bus: Bus, tv: Tv, house: House, utensils: Utensils, party: PartyPopper,
  card: CreditCard, package: Package, wallet: Wallet, tag: Tag,
  car: Car, fuel: Fuel, cart: ShoppingCart, bag: ShoppingBag, coffee: Coffee,
  gift: Gift, heart: Heart, health: HeartPulse, pill: Pill, school: GraduationCap,
  book: BookOpen, gym: Dumbbell, plane: Plane, shirt: Shirt, phone: Smartphone,
  wifi: Wifi, energy: Zap, water: Droplets, pet: PawPrint, baby: Baby,
  game: Gamepad2, music: Music, film: Film, tools: Wrench, work: Briefcase,
  piggy: PiggyBank, bank: Landmark, receipt: Receipt, cash: Banknote, invest: TrendingUp,
};

// Categoria padrão (id estável) → ícone.
export const categoryIcons = {
  transporte: Bus,
  assinaturas: Tv,
  casa: House,
  alimentacao: Utensils,
  lazer: PartyPopper,
  dividas: CreditCard,
  outros: Package,
  renda: Wallet,
};

// iconKey escolhido > ícone padrão da categoria > Tag. Dado antigo (sem
// iconKey, só o emoji em `icon`) cai no padrão por id ou em Tag.
export function categoriaIcon(categoria) {
  return ICONS[categoria?.iconKey] || categoryIcons[categoria?.id] || Tag;
}

export const conquistaIcons = {
  "primeiro-lancamento": FilePen,
  "primeira-paga": CircleCheck,
  pontual: Timer,
  semana: Flame,
  tesoura: Scissors,
  "primeira-caixinha": PiggyBank,
  "meta-batida": Trophy,
  "mes-azul": TrendingUp,
  "reserva-1": LifeBuoy,
  "reserva-completa": Castle,
  "divida-quitada": CreditCard,
};
