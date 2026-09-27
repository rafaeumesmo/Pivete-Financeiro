import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LabelList, LineChart, Line, Legend, ReferenceLine,
} from "recharts";
import { SectionTitle, SmallButton, ProgressBar } from "./ui.jsx";
import { findCategoria, CHART_ORDER } from "../lib/categories.js";
import { formatBRL } from "../lib/money.js";
import { todayKey, monthKey, addMonths, formatSnoozeReturn } from "../lib/dates.js";
import {
  resumoMes, comprometimento, patrimonio, projecao12m, fixosMensais, rendaMensal, gastoVariavelMedio,
} from "../lib/finance.js";

// Cores de papel (não de série) do tema escuro dos gráficos.
const INK_MUTED = "rgba(255,255,255,0.4)";
const GRID = "rgba(255,255,255,0.06)";
const SURFACE = "#111114";
const COR_TENHO = "#3987e5";
const COR_DEVO = "#e66767";
const COR_SOBRA = "#34343b"; // parte da renda ainda livre: trilho neutro, não uma "categoria"
const COR_OUTROS = "#7c7b76";
const MAX_FATIAS = 4;        // + "Outros" + "Sobra" = no máximo 6 fatias

const brl = (v) => formatBRL(v);
// Espaço não separável: o Recharts quebra rótulos SVG em espaço comum
// ("R$" numa linha, número na outra).
const brlCompact = (v) => formatBRL(v, { compact: true }).replace(" ", "\u00a0");

function ChartTooltip({ active, payload, label, labelFmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#1f2027] border border-white/10 px-3 py-2 shadow-xl text-[12px]">
      {label !== undefined && <p className="text-white/50 mb-1">{labelFmt ? labelFmt(label) : label}</p>}
      {payload.map(p => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-white">
          <span className="w-2 h-2 rounded-full" style={{ background: p.payload?.fill || p.color }} />
          <span className="text-white/70">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{brl(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Tile({ label, value, sub, tone = "text-white" }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3 min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums truncate ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-white/35 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// Fatias da pizza "pra onde vai a renda": categorias em ordem fixa (cor
// segue a categoria), as menores dobradas em "Outros", e a sobra no fim.
function fatiasRenda(resumo, categorias) {
  const cats = Object.entries(resumo.porCategoria).filter(([, v]) => v > 0);
  const top = [...cats].sort((a, b) => b[1] - a[1]).slice(0, MAX_FATIAS).map(([id]) => id);
  const ordem = (id) => { const i = CHART_ORDER.indexOf(id); return i === -1 ? 99 : i; };
  const fatias = cats.filter(([id]) => top.includes(id) && id !== "outros").sort((a, b) => ordem(a[0]) - ordem(b[0]))
    .map(([id, v]) => { const c = findCategoria(categorias, id); return { id, name: c.nome, value: v, fill: c.cor }; });
  const resto = cats.filter(([id]) => !top.includes(id) || id === "outros").reduce((a, [, v]) => a + v, 0);
  if (resto > 0) fatias.push({ id: "outros", name: "Outros", value: resto, fill: COR_OUTROS });
  if (resumo.sobra > 0) fatias.push({ id: "sobra", name: "Sobra", value: resumo.sobra, fill: COR_SOBRA });
  return fatias;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function PainelPanel({ finance, isDesktop }) {
  const { lancamentos, recorrentes, dividas, contas, metas, categorias } = finance;
  const hoje = todayKey();
  const ym = monthKey(hoje);
  const resumo = resumoMes(lancamentos, ym);
  const rendaFixa = rendaMensal(recorrentes);
  const renda = resumo.entradas || rendaFixa;
  const comp = comprometimento({ recorrentes, dividas, renda });
  const pat = patrimonio({ contas, metas, dividas, lancamentos, hoje });
  const variavel = gastoVariavelMedio(lancamentos, hoje);
  const proj = projecao12m({ tenho: pat.caixa, dividas, renda: rendaFixa || resumo.entradas, fixos: fixosMensais(recorrentes), variavel, aPagar: pat.aPagar })
    .map(p => ({ ...p, label: p.mes === 0 ? "hoje" : MESES[Number(addMonths(hoje, p.mes, 1).slice(5, 7)) - 1] }));
  const fatias = fatiasRenda(resumo, categorias);
  const baseFatias = fatias.reduce((a, f) => a + f.value, 0);
  const barras = [
    { name: "Tenho", value: pat.tenho, fill: COR_TENHO },
    { name: "Devo", value: -pat.devo, fill: COR_DEVO },
    { name: "Patrimônio líquido", value: pat.liquido, fill: pat.liquido >= 0 ? COR_TENHO : COR_DEVO },
  ];
  const adiados = lancamentos.filter(l => l.status === "adiado");
  const chartH = isDesktop ? 240 : 200;

  const saldoContas = contas.reduce((a, c) => a + c.saldo, 0);
  const guardado = metas.reduce((a, m) => a + Math.max(0, m.guardado), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Saldo nas contas */}
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#3987e5]/20 to-white/[0.02] px-5 py-4">
        <p className="text-[11px] uppercase tracking-widest text-white/45">Saldo nas contas</p>
        <p className={`text-3xl font-bold tabular-nums mt-1 ${saldoContas < 0 ? "text-red-400" : "text-white"}`}>{brl(saldoContas)}</p>
        {guardado > 0 && <p className="text-[12px] text-white/45 mt-0.5">+ {brl(guardado)} nas caixinhas · total {brl(saldoContas + guardado)}</p>}
        {contas.length > 1 && (
          <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-col gap-1.5">
            {contas.map(c => (
              <div key={c.id} className="flex items-center justify-between text-[13px]">
                <span className="text-white/65 truncate pr-3">{c.nome}</span>
                <span className={`tabular-nums font-medium ${c.saldo < 0 ? "text-red-400" : "text-white"}`}>{brl(c.saldo)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Números do mês */}
      <div>
        <SectionTitle>Este mês</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Renda do mês" value={brl(renda)} sub={resumo.entradas ? "entradas lançadas" : rendaFixa ? "pela renda fixa" : "sem entradas"} tone="text-emerald-400" />
          <Tile label="Saídas" value={brl(resumo.saidas)} sub={`${brl(resumo.saidasPagas)} pagas`} />
          <Tile label="Sobra" value={brl(renda - resumo.saidas)} sub="renda − saídas" tone={renda - resumo.saidas >= 0 ? "text-white" : "text-red-400"} />
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Comprometido</p>
            <p className={`text-lg font-bold tabular-nums ${comp > 0.7 ? "text-red-400" : comp > 0.5 ? "text-amber-300" : "text-white"}`}>{comp === null ? "—" : `${Math.round(comp * 100)}%`}</p>
            <div className="mt-1.5"><ProgressBar pct={(comp || 0) * 100} color={comp > 0.7 ? "#e66767" : comp > 0.5 ? "#c98500" : "#3987e5"} label="Renda comprometida com fixos e dívidas" /></div>
            <p className="text-[10px] text-white/30 mt-1">fixos + parcelas</p>
          </div>
        </div>
      </div>

      {/* Pizza */}
      <div>
        <SectionTitle>Pra onde vai a renda</SectionTitle>
        {baseFatias === 0 ? (
          <p className="text-[12px] text-white/30 px-1">Sem entradas nem saídas neste mês ainda.</p>
        ) : (
          <div className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex ${isDesktop ? "flex-row items-center gap-6" : "flex-col gap-3"}`}>
            <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={fatias} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} startAngle={90} endAngle={-270} stroke={SURFACE} strokeWidth={2} isAnimationActive={false}>
                    {fatias.map(f => <Cell key={f.id} fill={f.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] uppercase tracking-widest text-white/35">{resumo.sobra >= 0 ? "Renda" : "Saídas"}</p>
                <p className="text-[15px] font-bold text-white tabular-nums">{brlCompact(baseFatias)}</p>
              </div>
            </div>
            {/* Legenda = tabela com todos os valores */}
            <table className="flex-1 text-[12px]">
              <caption className="sr-only">Saídas do mês por categoria</caption>
              <tbody>
                {fatias.map(f => (
                  <tr key={f.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-1.5 pr-2"><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-2" style={{ background: f.fill, outline: f.id === "sobra" ? "1px solid rgba(255,255,255,0.25)" : undefined }} /><span className="text-white/75">{f.name}</span></td>
                    <td className="py-1.5 text-right text-white/45 tabular-nums">{Math.round((f.value / baseFatias) * 100)}%</td>
                    <td className="py-1.5 pl-3 text-right text-white tabular-nums">{brl(f.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resumo.sobra < 0 && <p className="text-[11px] text-red-300/80">As saídas passaram a renda do mês em {brl(-resumo.sobra)}.</p>}
          </div>
        )}
      </div>

      {/* Barras */}
      <div>
        <SectionTitle>Tenho × Devo × Patrimônio líquido</SectionTitle>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3" style={{ height: chartH + 24 }}>
          <ResponsiveContainer>
            <BarChart data={barras} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="name" tick={{ fill: INK_MUTED, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis hide domain={[(min) => Math.min(0, min), "auto"]} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip />} />
              <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {barras.map(b => <Cell key={b.name} fill={b.fill} />)}
                <LabelList dataKey="value" position="top" formatter={brlCompact} style={{ fill: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-white/30 mt-1.5 px-1">Tenho = tudo que entrou − saiu nas contas + caixinhas (nunca abaixo de zero). Devo = dívidas + contas no vermelho + contas ainda não pagas{pat.aPagar > 0 && <> (<span className="text-red-300/80 tabular-nums">{brl(pat.aPagar)}</span> vencidas ou deste mês)</>}.</p>
      </div>

      {/* Linha */}
      <div>
        <SectionTitle>Projeção de 12 meses</SectionTitle>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3" style={{ height: chartH + 40 }}>
          <ResponsiveContainer>
            <LineChart data={proj} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={{ fill: INK_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} interval={isDesktop ? 0 : 2} />
              <YAxis tick={{ fill: INK_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={56} tickFormatter={brlCompact} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.25)" }} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, color: INK_MUTED }} />
              <Line type="monotone" dataKey="tenho" name="Tenho" stroke={COR_TENHO} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="divida" name="Dívida" stroke={COR_DEVO} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-white/30 mt-1.5 px-1 leading-relaxed">
          Sem juros extras: as contas não pagas de hoje saem do caixa no 1º mês; depois, todo mês entra a renda fixa ({brl(rendaFixa || resumo.entradas)}) e saem os fixos ({brl(fixosMensais(recorrentes))}), o gasto variável médio dos últimos 3 meses ({brl(variavel)}) e as parcelas das dívidas até acabarem.
        </p>
      </div>

      {/* Adiados */}
      {adiados.length > 0 && (
        <div>
          <SectionTitle>Adiados · {adiados.length}</SectionTitle>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
            {adiados.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="text-lg">{findCategoria(categorias, l.categoria).icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white truncate">{l.descricao} · <span className="tabular-nums">{brl(l.valor)}</span></p>
                  <p className="text-[11px] text-amber-400/70">Volta {l.adiadoAte ? formatSnoozeReturn(l.adiadoAte) : "em breve"}</p>
                </div>
                <SmallButton tone="blue" onClick={() => finance.trazerDeVolta(l.id)}>Trazer agora</SmallButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
