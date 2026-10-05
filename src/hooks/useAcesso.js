import { createContext, useContext } from "react";
import { precisaConta } from "../lib/acesso.js";

// exigirConta(acao) → true se pode seguir; senão abre o pedido de conta
// (com o motivo) e devolve false. Sem provider: tudo liberado.
const AcessoContext = createContext({ modo: "conta", exigirConta: () => true });
export const AcessoProvider = AcessoContext.Provider;
export function useAcesso() { return useContext(AcessoContext); }

export function criarExigirConta({ modo, pedir }) {
  return (acao) => {
    if (!precisaConta(modo, acao)) return true;
    pedir();
    return false;
  };
}
