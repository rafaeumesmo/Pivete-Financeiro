# TaskMatch — Documentação de IHC e Roteiro de Teste de Usabilidade

---

## PARTE 1 — Roteiro de Teste de Usabilidade (Protótipo)

### Contexto para o Facilitador
Apresente ao participante o protótipo do TaskMatch sem explicar a mecânica de swipe antecipadamente. Observe as interações e aplique o questionário após cada tarefa-chave. Escala uniforme: **1 = Muito Difícil · 2 = Difícil · 3 = Neutro · 4 = Fácil · 5 = Muito Fácil**.

---

### Tarefas e Perguntas

| # | Tarefa Observada | Pergunta ao Participante | Escala |
|---|---|---|---|
| 1 | Abrir o app pela primeira vez e chegar à tela de cards sem ajuda externa | Quão fácil foi entender o que o app esperava que você fizesse logo na primeira tela? | 1 – 5 |
| 2 | Realizar o swipe para a direita (aceitar uma tarefa) | Quão fácil foi executar o gesto de arrastar para a direita para indicar que vai realizar a tarefa? | 1 – 5 |
| 3 | Realizar o swipe para a esquerda (adiar/rejeitar uma tarefa) | Quão fácil foi entender que arrastar para a esquerda significava "deixar para depois"? | 1 – 5 |
| 4 | Realizar o swipe para cima (delegar/compartilhar) | Quão fácil foi descobrir e executar o gesto de arrastar para cima para compartilhar a tarefa com alguém? | 1 – 5 |
| 5 | Identificar o feedback de cor durante o arrasto (verde/vermelho/azul) | Quão fácil foi associar as cores que apareceram durante o swipe com a ação que estava sendo realizada? | 1 – 5 |
| 6 | Usar os botões flutuantes (X, seta, check) como alternativa ao swipe | Quão fácil foi usar os botões na parte inferior da tela para realizar as mesmas ações sem precisar arrastar? | 1 – 5 |
| 7 | Voltar a um card rejeitado ou desfazer uma ação acidental | Quão fácil foi perceber se havia uma forma de desfazer uma ação feita por engano? | 1 – 5 |
| 8 | Concluir todo o deck e interpretar a tela de resultados finais | Quão fácil foi entender o resumo de resultados exibido ao terminar de avaliar todos os cards? | 1 – 5 |

---

### Critérios de Corte
- Perguntas 1–4 com média **< 3,5**: revisar onboarding e descoberta de gestos.
- Pergunta 7 com nota **< 4**: implementar ação de desfazer (undo) com gesto shake ou botão dedicado.
- Pergunta 5 com nota **< 4**: aumentar contraste e adicionar label textual transitória ("Aceito!", "Depois", "Compartilhar").

---

## PARTE 2 — Documentação de IHC (Visão de Produto)

---

### 1. Definição do Problema e Contexto

**Paralisia de Decisão em Contexto Pessoal e Social**

O psicólogo Barry Schwartz descreve o "Paradoxo da Escolha": quanto mais opções disponíveis, maior a ansiedade decisional e menor a satisfação com a escolha feita. No contexto de produtividade pessoal, isso se manifesta como listas de tarefas intermináveis onde o usuário adia decisões por não saber por onde começar — o sistema de gestão vira ele mesmo um fardo.

No plano social, o problema ganha uma camada de atrito interpessoal. Grupos de amigos tentam combinar atividades (filmes, restaurantes, viagens) majoritariamente via WhatsApp, um canal assíncrono e desestruturado. O fluxo típico envolve: (1) alguém lança uma pergunta aberta no grupo; (2) múltiplas sugestões aparecem em paralelo; (3) conversas secundárias se sobrepõem; (4) ninguém chega a uma decisão, o tópico some no histórico. Este é o "caos de coordenação" — um problema de UX coletivo sem solução nativa nas ferramentas existentes.

**TaskMatch** ataca os dois vetores: reduz a carga cognitiva individual (uma tarefa por vez, decisão binária) e estrutura a decisão coletiva (deck compartilhado, resultados agregados, sem exigir cadastro dos participantes).

---

### 2. User Persona

**Lucas Mendes, 26 anos — Designer UX em São Paulo**

- **Tecnologia:** Usuário avançado de smartphone. Usa Notion, Todoist e Google Calendar, mas abandona as ferramentas após 2 semanas porque "a manutenção do sistema custa mais do que o benefício".
- **Comportamento social:** Organiza saídas com 4–6 amigos frequentemente. O WhatsApp é o canal padrão, mas decisões de grupo demoram de horas a dias. Fica frustrado quando a conversa morre sem conclusão.
- **Dores principais:**
  - Lista de tarefas com 40+ itens paralisa em vez de orientar.
  - Sente culpa ao ignorar tarefas sem decidir explicitamente.
  - Perde tempo em "micro-negociações" sociais que deveriam ser simples.
- **Motivação:** Quer um sistema que "tome a decisão com ele, não por ele" — que reduza o esforço de triagem a segundos, não minutos.
- **Citação representativa:** *"Já tentei todo tipo de app de tarefa. No fim, o que funciona é arrastar pra esquerda e esquecer. Tipo Tinder, só que pras minhas obrigações."*

---

### 3. User Journey (Jornada Atual — Estado da Dor)

```
[Gatilho] Lucas precisa decidir o que fazer no fim de semana com o grupo.
     │
     ▼
[1. Inicia conversa no WhatsApp]
     Abre o grupo, digita "e aí, o que vocês querem fazer?"
     Dor: pergunta aberta → respostas dispersas
     │
     ▼
[2. Surge caos de sugestões]
     Ana sugere cinema. Pedro quer churrasco. João não respondeu.
     Dor: sem estrutura, impossível agregar preferências
     │
     ▼
[3. Tentativa de votação manual]
     Lucas manda "reajam com 🍿 para cinema ou 🔥 para churrasco"
     Dor: solução gambiarra, não escala, não registra
     │
     ▼
[4. Silêncio e inércia]
     Metade do grupo não reage. Conversa cai no histórico.
     Dor: decisão não tomada, frustração acumulada
     │
     ▼
[5. Abandono ou decisão unilateral]
     Lucas decide sozinho ou o fim de semana passa sem plano.
     Dor: sensação de esforço desperdiçado, desconexão social
```

**Pontos de dor mapeados:**
- Falta de estrutura para coletar preferências de forma assíncrona.
- Fricção de onboarding: exige que todos usem o mesmo app.
- Ausência de agregação visual de votos em tempo real.
- Nenhum mecanismo de "desfazer inércia" — quem não age bloqueia a decisão.

---

### 4. Análise Heurística — 5 Princípios de Jakob Nielsen

**H1 — Visibilidade do Estado do Sistema**
O TaskMatch implementa feedback imediato e proporcional durante o gesto de swipe: a sobreposição de cor verde (aceitar), vermelho (rejeitar) ou azul (compartilhar) aumenta em opacidade conforme a distância do arrasto. O usuário vê em tempo real qual ação será executada antes de soltar o card. Não há ambiguidade sobre o estado da interação. A barra de progresso no topo ("3 de 6 cards") complementa a visibilidade ao nível macro do fluxo.

**H2 — Correspondência entre o Sistema e o Mundo Real**
A metáfora de "baralho de cartas" (deck) é familiar e o gesto de swipe é consolidado por aplicativos de alto alcance (Tinder, Bumble, apps de curadoria de conteúdo). O usuário não precisa aprender um novo modelo mental — ele transfere comportamento já automatizado para um novo contexto. Os rótulos "Aceitar", "Depois" e "Delegar" usam linguagem cotidiana, não jargão técnico.

**H3 — Consistência e Padrões**
A direção do gesto sempre corresponde à mesma ação, independentemente do deck ou do contexto: direita é sempre positivo (verde), esquerda sempre negativo (vermelho), cima sempre compartilhamento (azul). Os botões flutuantes espelham exatamente essa mesma semântica direcional com ícones universais (✕, ↑, ✓). Não há ação que tenha duas representações inconsistentes.

**H4 — Prevenção de Erros — O Efeito "Mola"**
Cards soltos dentro de uma zona neutra (deslocamento abaixo de 30% da largura do card) retornam animados ao centro com uma animação de spring (mola), sem executar nenhuma ação. Isso cria uma "zona de intenção" que exige comprometimento explícito antes de executar a ação. O usuário que arrasta sem intenção ou muda de ideia no meio do gesto simplesmente solta o card e ele volta, sem consequências. Isso previne o erro mais comum: o swipe acidental.

**H5 — Reconhecimento em vez de Recordação**
Toda informação necessária para tomar a decisão está visível no card: título, descrição, categoria e contexto visual. O usuário não precisa memorizar conteúdo de cards anteriores para avaliar o atual. Os ícones dos botões flutuantes são autoexplicativos e consistentemente posicionados. O onboarding é dispensável para usuários que já internalizaram o padrão de swipe — o app funciona por reconhecimento imediato, não por instrução prévia.

---

### 5. Proposta de Solução — Diferencial do TaskMatch

**Arquitetura "Zero Fricção para Convidados" (PWA Assimétrico)**

O diferencial central do TaskMatch é sua assimetria de autenticação: somente o criador do deck precisa de conta. Os participantes convidados recebem um link único (gerado via Web Share API / WhatsApp) e respondem diretamente no navegador, sem instalar nada, sem cadastro, sem senha.

```
[Criador — autenticado]          [Convidados — anônimos]
        │                                  │
   Cria o deck                    Recebem link via WhatsApp
   Define os cards                Abrem no browser
   Compartilha o link             Fazem swipe nos cards
        │                                  │
        └──────────── Resultados agregados em tempo real ────┘
                              │
                     Criador vê painel de resultados:
                     "Pedir Pizza: 3/4 aceitos ✓"
```

**Por que isso importa do ponto de vista de IHC:**
- Elimina a barreira de adoção mais crítica em apps sociais: a exigência de que todos instalem e cadastrem.
- Mantém o fluxo de compartilhamento dentro do canal já existente (WhatsApp), reduzindo a disrupção de hábito.
- O modelo PWA garante que a experiência nativa de swipe funcione em qualquer dispositivo sem fricção de instalação, mesmo para o criador.
- A assimetria de login é, ela mesma, uma decisão de design de produto alinhada ao princípio de mínimo esforço necessário — apenas quem precisa de persistência (o criador) cria conta.

**Roadmap de Diferenciação Futuro:**
1. **Modo Votação Temporizada:** deck expira em X horas, aumentando urgência e reduzindo procrastinação coletiva.
2. **Consenso Automático:** quando todos os participantes aceitam uma opção, notificação push automática ao criador.
3. **Templates de Deck:** "Sair essa semana", "Escolher filme", "Dividir tarefas" — redução adicional da Lei de Hick na criação.

---

*Documento elaborado com base nos princípios de Jakob Nielsen (1994), na Lei de Hick-Hyman e no modelo de Paradoxo da Escolha de Barry Schwartz (2004). Versão 1.0 — MVP.*
