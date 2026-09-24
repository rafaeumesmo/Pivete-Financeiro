import { useEffect, useRef } from "react";
import { SK, usePersistedState } from "../lib/storage.js";
import { DEFAULT_CATEGORIAS } from "../lib/categories.js";
import { todayKey, addDays, fromDateStr } from "../lib/dates.js";
import {
  materializar, mergeNovos, adiamentoExpirado, aplicarPagamento, makeId, randomId, custoEfetivo, gerarParcelamento,
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
    const divisao = { partes, minhaParte, porPessoa: outras[0] ?? 0, aReceber: outras.reduce((a, b) => a + b, 0), cobrancaId: randomId() };
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

  // Tela "Novo lançamento". Três formas:
  // - avulso: 1 lançamento;
  // - fixo (recorrente): cria a recorrência a partir de `data`; os
  //   lançamentos saem da materialização (useEffect acima);
  // - parcelado: N lançamentos mensais ligados (gerarParcelamento).
  // `pago` quita na hora o primeiro lançamento e mexe no saldo da conta.
  function criarLancamento({ tipo, valor, categoria, descricao, data, recorrente, parcelas, pago, contaId }) {
    const conta = contaDe(contaId);
    const quitado = pago ? { status: "pago", pagoEm: new Date().toISOString(), contaId: conta?.id ?? null } : { status: "pendente" };
    const base = { tipo, categoria, descricao };

    if (recorrente) {
      const rec = { id: makeId("rec"), nome: descricao, valor, categoria, tipo, ...recorrente, ativo: true, inicio: data };
      if (pago) {
        // Grava já a 1ª ocorrência como paga (mesmo id que a materialização
        // geraria) e marca a recorrência como gerada até ela.
        setLancamentos(prev => [...prev, { ...base, id: `r:${rec.id}:${data}`, valor, data, recorrenteId: rec.id, ...quitado }]);
        rec.geradoAte = data;
      }
      setRecorrentes(prev => [...prev, rec]);
    } else if (parcelas) {
      const ls = gerarParcelamento({ ...base, valorTotal: valor, parcelas, data, descricao });
      if (pago) Object.assign(ls[0], quitado);
      setLancamentos(prev => [...prev, ...ls]);
      if (pago) valor = ls[0].valor;
    } else {
      setLancamentos(prev => [...prev, { ...base, id: makeId("l"), valor, data, ...quitado }]);
    }

    if (pago && conta) {
      moverSaldo(conta.id, tipo === "entrada" ? valor : -valor);
      setContaPadrao(conta.id);
    }
  }

  // ── Edição (aba Atividade) ─────────────────────────────────

  // Some com os lançamentos ainda não pagos de hoje em diante que batem com
  // `pred` — usado quando uma recorrência/dívida muda ou sai, pra que as
  // ocorrências futuras sejam regeradas (ou não) com os dados novos.
  function limparFuturos(pred) {
    const hoje = todayKey();
    setLancamentos(prev => prev.filter(l => !(pred(l) && l.status !== "pago" && l.data && l.data >= hoje)));
  }
  const regerarDeHoje = () => addDays(todayKey(), -1);

  function salvarRecorrente(rec) {
    if (rec.id && recorrentes.some(r => r.id === rec.id)) {
      limparFuturos(l => l.recorrenteId === rec.id);
      setRecorrentes(prev => prev.map(r => r.id === rec.id ? { ...rec, geradoAte: regerarDeHoje() } : r));
    } else {
      setRecorrentes(prev => [...prev, { ...rec, id: makeId("rec"), ativo: true, inicio: rec.inicio || todayKey() }]);
    }
  }

  // Pausar remove as ocorrências futuras; retomar volta a gerar a partir de
  // hoje (sem recriar o período pausado).
  function alternarRecorrente(id) {
    const rec = recorrentes.find(r => r.id === id);
    if (!rec) return;
    if (rec.ativo) limparFuturos(l => l.recorrenteId === id);
    setRecorrentes(prev => prev.map(r => r.id === id ? { ...r, ativo: !r.ativo, geradoAte: regerarDeHoje() } : r));
  }

  function removerRecorrente(id) {
    limparFuturos(l => l.recorrenteId === id);
    setRecorrentes(prev => prev.filter(r => r.id !== id));
  }

  function salvarDivida(d) {
    if (d.id && dividas.some(x => x.id === d.id)) {
      limparFuturos(l => l.dividaId === d.id);
      setDividas(prev => prev.map(x => x.id === d.id ? { ...x, ...d, geradoAte: regerarDeHoje() } : x));
    } else {
      setDividas(prev => [...prev, { ...d, id: makeId("div"), inicio: todayKey() }]);
    }
  }

  function removerDivida(id) {
    limparFuturos(l => l.dividaId === id);
    setDividas(prev => prev.filter(x => x.id !== id));
  }

  function salvarMeta(m) {
    if (m.id) setMetas(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x));
    else setMetas(prev => [...prev, { guardado: 0, ...m, id: makeId("meta") }]);
  }

  function removerMeta(id) {
    // O que estava guardado volta pra 1ª conta, pra não "sumir" dinheiro do patrimônio.
    const m = metas.find(x => x.id === id);
    if (m?.guardado > 0 && contas[0]) moverSaldo(contas[0].id, m.guardado);
    setMetas(prev => prev.filter(x => x.id !== id));
  }

  // Aporte (valor > 0) ou retirada (valor < 0): transferência entre conta e
  // caixinha — não é gasto, então não vira lançamento.
  function aportar(metaId, valor, contaId) {
    const conta = contaDe(contaId);
    setMetas(prev => prev.map(m => m.id === metaId ? { ...m, guardado: Math.max(0, m.guardado + valor) } : m));
    moverSaldo(conta?.id, -valor);
  }

  function salvarConta(c) {
    if (c.id) setContas(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x));
    else setContas(prev => [...prev, { saldo: 0, ...c, id: makeId("conta") }]);
  }

  function removerConta(id) {
    if (contas.length <= 1) return false;
    setContas(prev => prev.filter(c => c.id !== id));
    return true;
  }

  function atualizarLancamento(id, patch) {
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  // Desfaz um pagamento: volta a pendente e devolve o valor à conta. Parcela
  // de dívida não pode ser estornada (a amortização já mexeu no saldo devedor).
  function estornar(id) {
    const l = lancamentos.find(x => x.id === id);
    if (!l || l.status !== "pago" || l.dividaId) return false;
    moverSaldo(l.contaId, l.tipo === "entrada" ? -l.valor : l.valor);
    setLancamentos(prev => prev.map(x => x.id === id ? { ...x, status: "pendente", pagoEm: null, contaId: null, divisao: undefined } : x));
    return true;
  }

  // Excluir um lançamento pago devolve o valor à conta (exceto parcela de dívida).
  function removerLancamento(id) {
    const l = lancamentos.find(x => x.id === id);
    if (!l) return;
    if (l.status === "pago" && !l.dividaId) moverSaldo(l.contaId, l.tipo === "entrada" ? -l.valor : l.valor);
    setLancamentos(prev => prev.filter(x => x.id !== id));
  }

  // ── Dados de exemplo (onboarding) ──────────────────────────
  // Renda 1.700 + 800 e fixos Passagem 450, Claude 110, Internet 40,
  // Spotify 20 — com vencimentos nos próximos dias pra o deck já mostrar
  // cards. Tudo marcado com `exemplo: true` pra poder limpar depois.
  function carregarExemplo() {
    const hoje = todayKey();
    const dia = (k) => fromDateStr(addDays(hoje, k)).getDate();
    const rec = (id, nome, valor, categoria, tipo, k) => ({ id: `ex-${id}`, nome, valor, categoria, tipo, frequencia: "mensal", dia: dia(k), ativo: true, inicio: hoje, exemplo: true });
    const exemplos = [
      rec("salario",  "Salário",     170000, "renda",       "entrada", 3),
      rec("extra",    "Renda extra",  80000, "renda",       "entrada", 10),
      rec("passagem", "Passagem",     45000, "transporte",  "saida",   0),
      rec("claude",   "Claude",       11000, "assinaturas", "saida",   6),
      rec("internet", "Internet",      4000, "casa",        "saida",   2),
      rec("spotify",  "Spotify",       2000, "assinaturas", "saida",   4),
    ];
    setRecorrentes(prev => [...prev.filter(r => !r.exemplo), ...exemplos]);
  }

  const temExemplo = recorrentes.some(r => r.exemplo);

  // Remove as recorrências de exemplo e TODOS os lançamentos gerados por
  // elas; o que foi pago/recebido volta pro saldo da conta como estava.
  function limparExemplo() {
    const ids = new Set(recorrentes.filter(r => r.exemplo).map(r => r.id));
    for (const l of lancamentos) {
      if (ids.has(l.recorrenteId) && l.status === "pago") moverSaldo(l.contaId, l.tipo === "entrada" ? -l.valor : l.valor);
    }
    setLancamentos(prev => prev.filter(l => !ids.has(l.recorrenteId)));
    setRecorrentes(prev => prev.filter(r => !r.exemplo));
  }

  function trazerDeVolta(id) {
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, status: "pendente", adiadoAte: null, voltou: true } : l));
  }

  return {
    salvarRecorrente, alternarRecorrente, removerRecorrente, salvarDivida, removerDivida,
    salvarMeta, removerMeta, aportar, salvarConta, removerConta,
    atualizarLancamento, estornar, removerLancamento, trazerDeVolta, carregarExemplo, limparExemplo, temExemplo,
    lancamentos, recorrentes, dividas, contas, metas, categorias, revisoes, contaPadrao,
    setLancamentos, setRecorrentes, setDividas, setContas, setMetas, setCategorias, setRevisoes,
    pagar, adiar, dividir, revisar, limparRevisoes, adicionarLancamentos, criarLancamento, moverSaldo, custoEfetivo,
  };
}
