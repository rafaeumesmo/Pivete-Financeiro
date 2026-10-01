import { SK, load, save } from "./storage.js";

// Regras puras ficam junto das Edge Functions (o servidor decide; o app só
// mostra). Ver supabase/functions/_shared/assinatura.js.
export { assinaturaAtiva, PRECO_CENTAVOS } from "../../supabase/functions/_shared/assinatura.js";

// Último estado conhecido (id de quem estava com a assinatura ativa), pro boot
// já saber onde ficam os dados antes de falar com o servidor (main.jsx) e pro
// app continuar salvando offline. O servidor confere de novo a cada gravação.
export function assinanteEmCache(userId) {
  const id = load(SK.assinante, null);
  return userId === undefined ? !!id : id === userId;
}
export function lembrarAssinante(userId) {
  if (userId) save(SK.assinante, userId);
  else { try { localStorage.removeItem(SK.assinante); } catch { /* storage bloqueado */ } }
}
