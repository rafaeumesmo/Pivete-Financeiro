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
| Dados pessoais (só logado com assinatura) | lançamentos, fixos, dívidas, contas, metas, categorias, histórico, streak e conquistas, visíveis só pro dono |

## Supabase (recursos sociais)

1. Crie um projeto e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` (local) e nas variáveis de ambiente da Vercel.
2. No **SQL Editor** do dashboard, rode `supabase/schema.sql`.
3. Depois, rode **na ordem** cada arquivo de `supabase/policies/`:
   - `01_splits.sql`: grupos, despesas divididas, partes e quitações, com RLS (só membros veem; só amigos aceitos entram no grupo; só quem pagou lança a despesa).
   - `02_charges.sql`: avisos de "paguei" do link de cobrança. Anônimos inserem, mas ninguém lista a tabela: quem cobra lê só a própria cobrança pela função `charge_payments_for`.
   - `03_bora_budget.sql`: coluna opcional `budget_cents` em `poll_options`.
   - `04_user_data.sql`: tabela `user_data`, que espelha os dados pessoais (lançamentos, dívidas, recorrentes…) de quem está logado pra que apareçam em qualquer navegador. RLS: cada usuário só lê e grava as próprias linhas.
   - `07_assinaturas.sql`: tabela `assinaturas` (só as Edge Functions gravam; cada usuário lê a própria linha) e a regra que **só deixa gravar em `user_data` quem tem assinatura ativa**. Rode logo depois do `04_user_data.sql`, inclusive quando rodar o 04 de novo: sozinho, ele deixa todo mundo só com leitura.
   - `06_profile_stats.sql`: tabela `profile_stats` (nível, ofensiva e conquistas), o lado público do perfil. RLS: só o dono e amigos aceitos leem. Também endurece `friendships` com um trigger: ninguém cria amizade "aceita" sozinho nem troca os ids de uma linha. Nenhum valor em R$ vai pra essa tabela.

> ⚠️ **As policies não são aplicadas automaticamente.** Nenhum deploy, build ou migração roda esses arquivos: é preciso colar e executar cada um no SQL Editor do Supabase. Sem eles, as abas **Social → Dividir** e **Cobranças** (avisos de pagamento) mostram um aviso de configuração, e o orçamento por pessoa do Bora? fica indisponível. O resto do app funciona normalmente. Todos os arquivos podem ser executados de novo sem problema.

Toda tabela nova precisa de um arquivo em `supabase/policies/` com o SQL de RLS.

## Assinatura (R$ 1,99/mês, Mercado Pago)

Sem login, ou logado sem assinatura, dá pra usar tudo, mas os dados ficam só na aba e somem quando ela fecha. Com assinatura ativa, os dados vão pra conta (`user_data`). Quem assinou agora tem o que fez na aba salvo na conta. Quem cancelou continua salvando até o fim do mês já pago. Quando a assinatura vence, os dados continuam na conta e voltam se a pessoa assinar de novo.

O cartão é digitado em campos do próprio Mercado Pago (Secure Fields, iframes): o app e o servidor só recebem um token. Quem decide se a pessoa pagou é o servidor: a Edge Function `assinatura` cria e cancela a assinatura, o webhook `mp-webhook` recebe os avisos do Mercado Pago, e o banco recusa a gravação de quem não está em dia (`07_assinaturas.sql`).

| Arquivo | O que faz |
|---|---|
| `supabase/functions/_shared/assinatura.js` | regras puras (quando está ativa, leitura do webhook), testadas em `src/lib/assinatura.test.js` |
| `supabase/functions/assinatura/` | `assinar` (com o token do cartão), `cancelar`, `atualizar` |
| `supabase/functions/mp-webhook/` | confere a assinatura do aviso, relê a assinatura na API do MP e grava |
| `src/hooks/useAssinatura.js` + `src/components/AssinaturaSheet.jsx` | estado no app, faixa "seus dados não estão sendo salvos", tela de pagamento (Perfil → Assinatura) |

### Configurar

1. Crie uma aplicação no [painel de desenvolvedor do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app). Comece com as **credenciais de teste** e com as **contas de teste** do painel (comprador e vendedor de teste). Em modo teste, o e-mail de quem assina precisa ser o de um comprador de teste.
2. Coloque a **Public Key** em `VITE_MP_PUBLIC_KEY` (`.env` e Vercel).
3. Rode `supabase/policies/07_assinaturas.sql` no SQL Editor.
4. Publique as funções com a CLI do Supabase:
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase secrets set MP_ACCESS_TOKEN=TEST-... APP_URL=https://seu-app.vercel.app
   npx supabase functions deploy assinatura
   npx supabase functions deploy mp-webhook --no-verify-jwt
   ```
5. No painel do MP → **Webhooks**, use a URL `https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-webhook` e marque o evento **Planos e assinaturas**. Copie a "assinatura secreta" e rode `npx supabase secrets set MP_WEBHOOK_SECRET=...`.
6. Pra cobrar de verdade, troque pelas credenciais de produção: a Public Key no `.env`/Vercel e o `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` nos secrets.

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
