# Pivete Financeiro

> O nome do app fica em um lugar só: `src/config.js` (`APP_NAME`). Trocar ali muda o cabeçalho, o onboarding, os links compartilhados e o título da aba. O ícone (gatinho) está em `src/components/Brand.jsx` e `public/favicon.svg`.

Organização financeira pessoal com a mecânica de swipe do TaskMatch: cada conta vira um card e você decide com um gesto.

- **→ Paguei / Recebi:** o valor sai ou entra na conta que você escolher.
- **← Adiar:** o card volta em 1 hora ou no dia seguinte.
- **↑ Dividir:** você paga o total e cobra a parte de cada pessoa por link.

Stack: React 18 + Vite, Tailwind, Framer Motion, Recharts e Supabase (só pra recursos sociais). O deploy é na Vercel.

## Rodando

```bash
npm install
cp .env.example .env   # opcional: só se for usar recursos sociais
npm run dev
npm test               # vitest: regras financeiras, saldos de divisão, conquistas
npm run lint
npm run build
```

## Local-first

**Tudo funciona sem login e sem Supabase.** Lançamentos, fixos, dívidas, contas, caixinhas, categorias, histórico, streak e conquistas ficam no `localStorage` do aparelho (chaves em `SK`, `src/lib/storage.js`).

**Sem login, saldos, contas, extrato, dívidas e caixinhas nunca saem do aparelho.** Logado, esses dados são espelhados na tabela `user_data` (só o próprio usuário lê, via RLS) pra aparecerem em qualquer navegador; a lógica está em `src/lib/sync.js`. Ao sair da conta, o app envia o que falta e apaga esses dados do navegador (continuam na conta). Configurações do aparelho (notificações, onboarding) não sincronizam.

Além disso, sai do aparelho o que o usuário escolhe compartilhar:

| Recurso | O que vai pro servidor |
|---|---|
| Dividir contas (grupos) | nome do grupo, membros, despesas divididas (descrição + valor), quitações |
| Link de cobrança | o id aleatório da cobrança e o nome de quem marcou "paguei" (o valor vai só no link) |
| Bora? (enquetes) | pergunta, opções, orçamento por pessoa (opcional) e votos |
| Perfil social | username, nome e emoji |
| Dados pessoais (só logado) | lançamentos, fixos, dívidas, contas, metas, categorias, histórico, streak e conquistas, visíveis só pro dono |

## Supabase (recursos sociais)

1. Crie um projeto e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` (local) e nas variáveis de ambiente da Vercel.
2. No **SQL Editor** do dashboard, rode `supabase/schema.sql`.
3. Depois, rode **na ordem** cada arquivo de `supabase/policies/`:
   - `01_splits.sql`: grupos, despesas divididas, partes e quitações, com RLS (só membros veem; só amigos aceitos entram no grupo; só quem pagou lança a despesa).
   - `02_charges.sql`: avisos de "paguei" do link de cobrança. Anônimos inserem, mas ninguém lista a tabela: quem cobra lê só a própria cobrança pela função `charge_payments_for`.
   - `03_bora_budget.sql`: coluna opcional `budget_cents` em `poll_options`.
   - `04_user_data.sql`: tabela `user_data`, que espelha os dados pessoais (lançamentos, dívidas, recorrentes…) de quem está logado pra que apareçam em qualquer navegador. RLS: cada usuário só lê e grava as próprias linhas.
   - `06_profile_stats.sql`: tabela `profile_stats` (nível, ofensiva e conquistas), o lado público do perfil. RLS: só o dono e amigos aceitos leem. Também endurece `friendships` com um trigger: ninguém cria amizade "aceita" sozinho nem troca os ids de uma linha. Nenhum valor em R$ vai pra essa tabela.

> ⚠️ **As policies não são aplicadas automaticamente.** Nenhum deploy, build ou migração roda esses arquivos: é preciso colar e executar cada um no SQL Editor do Supabase. Sem eles, as abas **Social → Dividir** e **Cobranças** (avisos de pagamento) mostram um aviso de configuração, e o orçamento por pessoa do Bora? fica indisponível. O resto do app funciona normalmente. Todos os arquivos podem ser executados de novo sem problema.

Toda tabela nova precisa de um arquivo em `supabase/policies/` com o SQL de RLS.

## Modelo de dados (local)

Os valores são **sempre inteiros em centavos** e só viram texto `R$ 1.234,56` na tela (`src/lib/money.js`). As datas de calendário são strings `YYYY-MM-DD` no fuso local (`src/lib/dates.js`).

| Chave (`SK`) | Forma |
|---|---|
| `lancamentos` | `{ id, tipo: 'entrada'\|'saida', valor, categoria, descricao, data, status: 'pendente'\|'pago'\|'adiado', recorrenteId?, dividaId?, contaId?, pagoEm?, adiadoAte?, parcela?, divisao? }` |
| `recorrentes` | `{ id, nome, valor, categoria, tipo, frequencia: 'mensal'\|'semanal', dia?, diaSemana?, ativo, inicio, geradoAte }` |
| `dividas` | `{ id, nome, credor, saldoDevedor, parcela, jurosMes, diaVencimento, geradoAte, quitadaEm? }` |
| `contas` | `{ id, nome, saldo }` |
| `metas` (caixinhas) | `{ id, nome, alvo, guardado, prazo? }` |
| `categorias` | as padrão (Transporte, Assinaturas, Casa/Contas, Alimentação, Lazer, Dívidas, Outros, Renda), com nome e ícone editáveis |

Fixos e dívidas viram lançamentos pendentes automaticamente até o fim do mês (ou até 7 dias à frente). O campo `geradoAte` impede que um lançamento apagado seja recriado. As regras de negócio são funções puras em `src/lib/finance.js`, testadas em `finance.test.js`.

## Estrutura

- **Início** (`FinDeck`): deck com os lançamentos que vencem nos próximos 7 dias, mais o modo *Revisar gastos* (Valeu a pena × Cortar), que no fim mostra quanto daria pra economizar por mês.
- **Novo lançamento** (`NovoLancamentoForm`): tipo, valor em teclado numérico, categoria, data, fixo mensal ou semanal, parcelamento em N vezes, "já paguei".
- **Atividade:**
  - Calendário;
  - Caixinhas;
  - Painel: resumo do mês, gráficos de pizza, barras e projeção de 12 meses, e os lançamentos adiados;
  - Fixos & Dívidas: parcelas restantes pela Tabela Price e destaque para juros de 5% a.m. ou mais;
  - Extrato com filtros.
- **Social:**
  - Cobranças: link público `#/cobranca/...`, com chave Pix opcional;
  - Dividir: grupos estilo Splitwise;
  - Amigos & Bora?: enquetes com orçamento por pessoa.
- **Perfil:** renda mensal, contas e saldos, reserva de emergência em N meses de custo, taxa de contas pagas em dia, conquistas com XP, categorias e "Limpar dados de exemplo".

## Dados de exemplo

No último passo do onboarding dá pra começar com dados de exemplo: renda de R$ 1.700 + R$ 800 e os fixos Passagem R$ 450, Claude R$ 110, Internet R$ 40 e Spotify R$ 20. Tudo fica marcado como exemplo, e **Perfil → Limpar dados de exemplo** remove esses itens sem tocar no que você cadastrou.
