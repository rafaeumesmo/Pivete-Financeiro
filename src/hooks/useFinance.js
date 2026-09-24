import { useEffect, useRef } from "react";
import { SK, usePersistedState } from "../lib/storage.js";
import { DEFAULT_CATEGORIAS } from "../lib/categories.js";
import { todayKey } from "../lib/dates.js";
import {
  materializar, mergeNovos, adiamentoExpirado, aplicarPagamento, makeId, custoEfetivo,
} from "../lib/finance.js";
import { splitCents } from "../lib/money.js";

export const CONTA_INICIAL = { id: "conta-corrente", nome: "Conta corrente", saldo: 0 };

// Estado financeiro local (localStorage) + as operações que mexem em mais de
// uma coleção ao mesmo tempo (pagar debita conta e amortiza dívida, etc).
// Cada coleção tem sua chave em SK, como pedido no modelo de dados.
export function useFinance() {
  const [lancamentos, setLancamentos] = usePersistedState(SK.lancamentos, []);
  const [recorrentes, setRecorrentes] = usePersistedState(SK.recorrentes, []);
  const [dividas,     setDividas]     = usePersistedState(SK.dividas, []);
  const [contas,      setContas]      = usePersistedState(SK.contas, [CONTA_INICIAL]);
  const [metas,       setMetas]       = usePersistedState(SK.metas, []);
  const [categorias,  setCategorias]  = usePersistedState(SK.categorias, DEFAULT_CATEGORIAS);
  const [revisoes,    setRevisoes]    = usePersistedState(SK.revisoes, {});
  const [contaPadrao, setContaPadrao] = usePersistedState(SK.contaPadrao, null);

  // Gera os lançamentos das recorrências/dívidas e "acorda" adiados vencidos.
  // Roda ao abrir, quando recorrências/dívidas mudam e a cada minuto (pra
  // virada do dia com o app aberto). Os ids determinísticos + mergeNovos
  // deixam isso idempotente mesmo com o efeito rodando 2x no StrictMode.
  const latest = useRef({ recorrentes, dividas });
  latest.current = { recorrentes, dividas };
  useEffect(() => {
    function tick() {
      const { recorrentes: recs, dividas: divs } = latest.current;
      const r = materializar({ recorrentes: recs, dividas: divs }, todayKey());
      if (r.recorrentes.some((x, i) => x !== recs[i])) setRecorrentes(r.recorrentes);
      if (r.dividas.some((x, i) => x !== divs[i])) setDividas(r.dividas);
      const now = new Date();
      setLancamentos(prev => {
        let next = mergeNovos(prev, r.novos);
        if (next.some(l => adiamentoExpirado(l, now))) {
          next = next.map(l => adiamentoExpirado(l, now) ? { ...l, status: "pendente", adiadoAte: null, voltou: true } : l);
        }
        return next;
      });
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [recorrentes, dividas]); // eslint-disable-line react-hooks/exhaustive-deps -- setters de usePersistedState são estáveis

  function contaDe(contaId) {
    return contas.find(c => c.id === contaId) || contas[0] || null;
  }

  function moverSaldo(contaId, delta) {
    if (!contaId || !delta) return;
    setContas(prev => prev.map(c => c.id === contaId ? { ...c, saldo: c.saldo + delta } : c));
  }

  // Paga (saída) ou recebe (entrada) um lançamento. Saída debita o valor
  // CHEIO da conta — numa conta dividida eu pago tudo e os outros me devem.
  // Retorna { quitouDivida } pra quem chamou poder comemorar.
  function pagar(lancamentoId, contaId, extra = {}) {
    const l = lancamentos.find(x => x.id === lancamentoId);
    if (!l) return {};
    const conta = contaDe(contaId);
    const pagoEm = new Date().toISOString();
    setLancamentos(prev => prev.map(x => x.id === lancamentoId
      ? { ...x, ...extra, status: "pago", pagoEm, contaId: conta?.id ?? null, adiadoAte: null, voltou: false }
      : x));
    moverSaldo(conta?.id, l.tipo === "entrada" ? l.valor : -l.valor);
    if (conta) setContaPadrao(conta.id);

    let quitouDivida = false;
    if (l.dividaId) {
      const d = dividas.find(x => x.id === l.dividaId);
      if (d) {
        const { saldoDevedor } = aplicarPagamento(d, l.valor);
        quitouDivida = d.saldoDevedor > 0 && saldoDevedor === 0;
        setDividas(prev => prev.map(x => x.id === d.id ? { ...x, saldoDevedor, ...(quitouDivida ? { quitadaEm: pagoEm } : {}) } : x));
        // Dívida quitada: some com as parcelas futuras que já tinham sido geradas.
        if (quitouDivida) setLancamentos(prev => prev.filter(x => !(x.dividaId === d.id && x.status !== "pago" && x.id !== lancamentoId)));
      }
    }
    return { quitouDivida, lancamento: l };
  }

  function adiar(lancamentoId, adiadoAte) {
    setLancamentos(prev => prev.map(x => x.id === lancamentoId ? { ...x, status: "adiado", adiadoAte, voltou: false } : x));
  }

  // Paguei a conta inteira e vou dividir: marca pago, debita o total e guarda
  // quanto cada um me deve. A cobrança em si (link, quem já pagou) vive no
  // Social.
  function dividir(lancamentoId, partes, contaId) {
    const l = lancamentos.find(x => x.id === lancamentoId);
    if (!l) return null;
    const [minhaParte, ...outras] = splitCents(l.valor, partes);
    const divisao = { partes, minhaParte, porPessoa: outras[0] ?? 0, aReceber: outras.reduce((a, b) => a + b, 0), cobrancaId: makeId("cob") };
    pagar(lancamentoId, contaId, { divisao });
    return { ...l, divisao };
  }

  function revisar(key, veredito) {
    setRevisoes(prev => ({ ...prev, [key]: { veredito, em: new Date().toISOString() } }));
  }

  function limparRevisoes() { setRevisoes({}); }

  function adicionarLancamentos(novos) {
    setLancamentos(prev => [...prev, ...novos]);
  }

  return {
    lancamentos, recorrentes, dividas, contas, metas, categorias, revisoes, contaPadrao,
    setLancamentos, setRecorrentes, setDividas, setContas, setMetas, setCategorias, setRevisoes,
    pagar, adiar, dividir, revisar, limparRevisoes, adicionarLancamentos, moverSaldo, custoEfetivo,
  };
}
