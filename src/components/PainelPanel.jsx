import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LabelList, LineChart, Line, Legend, ReferenceLine,
} from "recharts";
import { SectionTitle, SmallButton, ProgressBar, EyeButton } from "./ui.jsx";
import { findCategoria, CHART_ORDER } from "../lib/categories.js";
import { formatBRL } from "../lib/money.js";
import { useTema } from "../lib/theme.js";
import { useOcultarValores } from "../lib/privacy.js";
import { todayKey, monthKey, formatSnoozeReturn } from "../lib/dates.js";
import {
  resumoMes, comprometimento, patrimonio, rendaMensal, entradasSaidasAno,
} from "../lib/finance.js";

// Cores de papel (não de série) dos gráficos, por tema. O Recharts grava cor
// em atributo SVG, que não aceita var(--…), então vêm do JS.
const PAPEL = {
  escuro: { ink: "rgba(255,255,255,0.8)", muted: "rgba(255,255,255,0.4)", grid: "rgba(255,255,255,0.06)", zero: "rgba(255,255,255,0.2)", hover: "rgba(255,255,255,0.04)", cursor: "rgba(255,255,255,0.25)", surface: "#1A1B21", sobra: "#34343b" },
  claro:  { ink: "rgba(17,19,24,0.85)",   muted: "#6B7280",               grid: "#E6E8EC",                zero: "rgba(17,19,24,0.25)",   hover: "rgba(17,19,24,0.04)",    cursor: "rgba(17,19,24,0.25)",    surface: "#FFFFFF", sobra: "#E6E8EC" },
};
const COR_TENHO = "#3987e5";
const COR_DEVO = "#e66767";
const COR_ENTRADA = COR_TENHO;
const COR_SAIDA = COR_DEVO;
const COR_OUTROS = "#7c7b76";
const MAX_FATIAS = 4;        // + "Outros" + "Sobra" = no máximo 6 fatias

// Formatadores do painel, respeitando o botão de olho (oculto → "R$ •••••").
// Espaço não separável: o Recharts quebra rótulos SVG em espaço comum
// ("R$" numa linha, número na outra).
function formatadores(oculto) {
  return {
    brl: (v) => formatBRL(v, { oculto }),
    brlCompact: (v) => formatBRL(v, { compact: true, oculto }).replace(" ", "\u00a0"),
    brlExato: (v) => formatBRL(v, { oculto }).replace(" ", "\u00a0"),
  };
}

function ChartTooltip({ active, payload: todos, label, labelFmt, brl }) {
  const payload = todos?.filter(p => p.value != null); // mês sem dado (linha parada) não vira "R$ 0,00"
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-surface border border-line px-3 py-2 shadow text-[12px]">
      {label !== undefined && <p className="text-fg-2 mb-1">{labelFmt ? labelFmt(label) : label}</p>}
      {payload.map(p => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-fg">
          <span className="w-2 h-2 rounded-full" style={{ background: p.payload?.fill || p.color }} />
          <span className="text-fg">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{brl(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Tile({ label, value, sub, tone = "text-fg" }) {
  return (
    <div className="rounded-lg bg-surface border border-line px-4 py-3 min-w-0">
      <p className="text-[13px] text-fg-2 mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums truncate ${tone}`}>{value}</p>
      {sub && <p className="text-[12px] text-fg-3 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// Fatias da pizza "pra onde vai a renda": categorias em ordem fixa (cor
// segue a categoria), as menores dobradas em "Outros", e a sobra no fim.
// A sobra (parte da renda ainda livre) é um trilho neutro, não uma "categoria".
function fatiasRenda(resumo, categorias, corSobra) {
  const cats = Object.entries(resumo.porCategoria).filter(([, v]) => v > 0);
  const top = [...cats].sort((a, b) => b[1] - a[1]).slice(0, MAX_FATIAS).map(([id]) => id);
  const ordem = (id) => { const i = CHART_ORDER.indexOf(id); return i === -1 ? 99 : i; };
  const fatias = cats.filter(([id]) => top.includes(id) && id !== "outros").sort((a, b) => ordem(a[0]) - ordem(b[0]))
    .map(([id, v]) => { const c = findCategoria(categorias, id); return { id, name: c.nome, value: v, fill: c.cor }; });
  const resto = cats.filter(([id]) => !top.includes(id) || id === "outros").reduce((a, [, v]) => a + v, 0);
  if (resto > 0) fatias.push({ id: "outros", name: "Outros", value: resto, fill: COR_OUTROS });
  if (resumo.sobra > 0) fatias.push({ id: "sobra", name: "Sobra", value: resumo.sobra, fill: corSobra });
  return fatias;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function PainelPanel({ finance, isDesktop }) {
  const { lancamentos, recorrentes, dividas, contas, metas, categorias } = finance;
  const [tema] = useTema();
  const [ocultar] = useOcultarValores();
  const { brl, brlCompact, brlExato } = formatadores(ocultar);
  const P = PAPEL[tema];
  const hoje = todayKey();
  const ym = monthKey(hoje);
  const resumo = resumoMes(lancamentos, ym);
  const rendaFixa = rendaMensal(recorrentes);
  const renda = resumo.entradas || rendaFixa;
  const comp = comprometimento({ recorrentes, dividas, renda });
  const pat = patrimonio({ contas, metas, dividas, lancamentos, hoje });
  const ano = entradasSaidasAno(lancamentos, hoje).map(m => ({ ...m, label: MESES[m.mes] }));
  const fatias = fatiasRenda(resumo, categorias, P.sobra);
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
      <div className="rounded-lg border border-line bg-surface px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-fg-2">Saldo nas contas</p>
          <EyeButton />
        </div>
        <p className={`text-3xl font-semibold tabular-nums mt-1 ${saldoContas < 0 && !ocultar ? "text-neg" : "text-fg"}`}>{brl(saldoContas)}</p>
        {guardado > 0 && <p className="text-[12px] text-fg-2 mt-0.5">+ {brl(guardado)} nas caixinhas · total {brl(saldoContas + guardado)}</p>}
        {contas.length > 1 && (
          <div className="mt-3 pt-3 border-t border-line flex flex-col gap-1.5">
            {contas.map(c => (
              <div key={c.id} className="flex items-center justify-between text-[13px]">
                <span className="text-fg-2 truncate pr-3">{c.nome}</span>
                <span className={`tabular-nums font-medium ${c.saldo < 0 && !ocultar ? "text-neg" : "text-fg"}`}>{brl(c.saldo)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Números do mês */}
      <div>
        <SectionTitle>Este mês</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Renda do mês" value={brl(renda)} sub={resumo.entradas ? "entradas lançadas" : rendaFixa ? "pela renda fixa" : "sem entradas"} tone="text-pos" />
          <Tile label="Saídas" value={brl(resumo.saidas)} sub={`${brl(resumo.saidasPagas)} pagas`} />
          <Tile label="Sobra" value={brl(renda - resumo.saidas)} sub="renda − saídas" tone={renda - resumo.saidas >= 0 || ocultar ? "text-fg" : "text-neg"} />
          <div className="rounded-lg bg-surface border border-line px-4 py-3">
            <p className="text-[13px] text-fg-2 mb-1">Comprometido</p>
            <p className={`text-lg font-semibold tabular-nums ${comp > 0.7 ? "text-neg" : comp > 0.5 ? "text-warn" : "text-fg"}`}>{comp === null ? "—" : `${Math.round(comp * 100)}%`}</p>
            <div className="mt-1.5"><ProgressBar pct={(comp || 0) * 100} color={comp > 0.7 ? "rgb(var(--neg))" : comp > 0.5 ? "rgb(var(--warn))" : "rgb(var(--brand))"} label="Renda comprometida com fixos e dívidas" /></div>
            <p className="text-[12px] text-fg-3 mt-1">fixos + parcelas</p>
          </div>
        </div>
      </div>

      {/* Pizza */}
      <div>
        <SectionTitle>Pra onde vai a renda</SectionTitle>
        {baseFatias === 0 ? (
          <p className="text-[12px] text-fg-3 px-1">Sem entradas nem saídas neste mês ainda.</p>
        ) : (
          <div className={`rounded-lg border border-line bg-surface p-4 flex ${isDesktop ? "flex-row items-center gap-6" : "flex-col gap-3"}`}>
            <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={fatias} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} startAngle={90} endAngle={-270} stroke={P.surface} strokeWidth={2} isAnimationActive={false}>
                    {fatias.map(f => <Cell key={f.id} fill={f.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip brl={brl} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[12px] text-fg-3">{resumo.sobra >= 0 ? "Renda" : "Saídas"}</p>
                <p className="text-[15px] font-bold text-fg tabular-nums">{brlExato(baseFatias)}</p>
              </div>
            </div>
            {/* Legenda = tabela com todos os valores */}
            <table className="flex-1 text-[12px]">
              <caption className="sr-only">Saídas do mês por categoria</caption>
              <tbody>
                {fatias.map(f => (
                  <tr key={f.id} className="border-b border-line last:border-0">
                    <td className="py-1.5 pr-2"><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-2" style={{ background: f.fill, outline: f.id === "sobra" ? `1px solid ${P.cursor}` : undefined }} /><span className="text-fg">{f.name}</span></td>
                    <td className="py-1.5 text-right text-fg-2 tabular-nums">{Math.round((f.value / baseFatias) * 100)}%</td>
                    <td className="py-1.5 pl-3 text-right text-fg tabular-nums">{brl(f.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resumo.sobra < 0 && <p className="text-[12px] text-neg">As saídas passaram a renda do mês em {brl(-resumo.sobra)}.</p>}
          </div>
        )}
      </div>

      {/* Barras */}
      <div>
        <SectionTitle>Tenho × Devo × Patrimônio líquido</SectionTitle>
        <div className="rounded-lg border border-line bg-surface p-3" style={{ height: chartH + 24 }}>
          <ResponsiveContainer>
            <BarChart data={barras} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke={P.grid} />
              <XAxis dataKey="name" tick={{ fill: P.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis hide domain={[(min) => Math.min(0, min), "auto"]} />
              <ReferenceLine y={0} stroke={P.zero} />
              <Tooltip cursor={{ fill: P.hover }} content={<ChartTooltip brl={brl} />} />
              <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {barras.map(b => <Cell key={b.name} fill={b.fill} />)}
                <LabelList dataKey="value" position="top" formatter={brlExato} style={{ fill: P.ink, fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-fg-3 mt-1.5 px-1">Tenho = tudo que entrou − saiu nas contas + caixinhas (nunca abaixo de zero). Devo = dívidas + contas no vermelho + contas ainda não pagas{pat.aPagar > 0 && <> (<span className="text-neg tabular-nums">{brl(pat.aPagar)}</span> vencidas ou deste mês)</>}.</p>
      </div>

      {/* Linha */}
      <div>
        <SectionTitle>Entradas × saídas em {hoje.slice(0, 4)}</SectionTitle>
        <div className="rounded-lg border border-line bg-surface p-3" style={{ height: chartH + 40 }}>
          <ResponsiveContainer>
            <LineChart data={ano} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={P.grid} />
              <XAxis dataKey="label" tick={{ fill: P.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={isDesktop ? 0 : 1} />
              <YAxis tick={{ fill: P.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={56} tickFormatter={brlCompact} />
              <Tooltip content={<ChartTooltip brl={brl} />} cursor={{ stroke: P.cursor }} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, color: P.muted }} />
              <Line type="monotone" dataKey="entradas" name="Entradas" stroke={COR_ENTRADA} strokeWidth={2} dot={{ r: 2.5, fill: COR_ENTRADA, strokeWidth: 0 }} activeDot={{ r: 4, stroke: P.surface, strokeWidth: 2 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="saidas" name="Saídas" stroke={COR_SAIDA} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2.5, fill: COR_SAIDA, strokeWidth: 0 }} activeDot={{ r: 4, stroke: P.surface, strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[12px] text-fg-3 mt-1.5 px-1 leading-relaxed">
          Soma dos lançamentos de cada mês, pagos ou não (o mesmo critério de "Este mês"). A linha para em {MESES[Number(ym.slice(5, 7)) - 1]}: os meses seguintes ainda não têm lançamentos.
        </p>
      </div>

      {/* Adiados */}
      {adiados.length > 0 && (
        <div>
          <SectionTitle>Adiados · {adiados.length}</SectionTitle>
          <div className="rounded-lg border border-line bg-surface divide-y divide-line">
            {adiados.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="text-lg">{findCategoria(categorias, l.categoria).icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-fg truncate">{l.descricao} · <span className="tabular-nums">{brl(l.valor)}</span></p>
                  <p className="text-[12px] text-warn">Volta {l.adiadoAte ? formatSnoozeReturn(l.adiadoAte) : "em breve"}</p>
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
