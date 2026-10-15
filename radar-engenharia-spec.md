# RADAR · Inteligência de Engenharia — Spec do Protótipo (Front-end only)

> **Instrução para o Claude Code:** construa um protótipo **somente front-end**, com **dados mockados**, seguindo esta spec. **Não crie back-end, API, banco nem autenticação.** Todas as integrações (GitHub, Jira, AWS/Kiro) são simuladas com arquivos de mock em TypeScript. O objetivo é uma demo de hackathon **bonita, navegável e convincente**.

---

## 1. Contexto e problema

Plataforma interna da **VP Tech** (~120 devs) para responder a uma pergunta que hoje ninguém consegue responder com números:

> **"A adoção de IA (Kiro + AI-DLC) está realmente melhorando a engenharia — em velocidade, qualidade e custo?"**

Dores levantadas nas entrevistas com lideranças:

1. **Não há como provar impacto da IA para os executivos.** Marcos: Dev Hub (outubro), plataforma + AI-DLC (dezembro). Ninguém sabe dizer como esses marcos mexeram nos indicadores. Não existe um book de indicadores único para toda a engenharia.
2. **Paradoxo dos PRs:** com IA os PRs ficaram **gigantes**, mas o **tempo de aprovação caiu para minutos**. Isso sugere revisão superficial (ou revisão assistida por IA, e isso também precisa ser medido).
3. **Aderência ao requisito:** o código entregue bate com a história do Jira?
4. **Uso ineficiente do Kiro:** modelos caros usados para tarefas triviais (ex.: modelo top de linha para fazer commit), overage de licenças e a IA virando "mordomo".
5. **Trabalho manual de gestão:** planilhas de indicadores preenchidas à mão, status mensal montado manualmente e excesso de reuniões.
6. **Outer loop:** PRD/spec mal escritos geram ida e vinda, e chamados de infra demoram.

Frase-guia da demo:
> *"Esse PR: 99% feito por IA, aprovado em 30 segundos e não bate com o card do Jira. Isso tem que virar alerta para o Tech Lead."*

**Mensagem do produto:** IA não serve para reduzir time. Serve para atender a **demanda reprimida** com qualidade. O RADAR mostra se isso está acontecendo.

### Personas (seletor de visão no header)
| Persona | O que quer ver |
|---|---|
| **VP / Head de Engenharia** | Impacto da IA nos indicadores, custo, antes × depois dos marcos |
| **Tech Manager / Tech Lead** | Alertas de PR, qualidade por squad, quem precisa de apoio |
| **Dev** | Suas próprias métricas, comparadas à média do time (sem ranking punitivo) |

---

## 2. Stack e setup

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Card, Tabs, Table, Badge, Select, Sheet, Dialog, Tooltip, Progress, Avatar)
- **Recharts** para gráficos
- **lucide-react** para ícones
- **react-router-dom** para navegação entre abas (cada aba é uma rota)
- **framer-motion** para microanimações (entrada de cards, contadores)
- Fonte: **Inter** para o corpo e **JetBrains Mono** para números e métricas (Google Fonts)
- Sem back-end. Mocks em `src/mocks/*.ts` gerados por um **gerador com seed fixa** (dados consistentes a cada reload).

```bash
npm create vite@latest radar -- --template react-ts
cd radar
npm i recharts lucide-react react-router-dom framer-motion clsx tailwind-merge
# configurar Tailwind + shadcn/ui (npx shadcn@latest init) e adicionar os componentes listados
npm run dev
```

### Estrutura de pastas
```
src/
  app/            # layout, router, providers (tema, filtros globais, persona)
  components/     # KpiCard, TrendChart, RiskBadge, DevAvatar, EmptyState, FilterBar, etc.
  pages/
    Overview.tsx          # 1. Visão Executiva
    GithubDevs.tsx        # 2. GitHub por Dev
    GithubJira.tsx        # 3. GitHub × Jira
    AiUsage.tsx           # 4. Uso de IA (Kiro/AWS)
    AiCost.tsx            # 5. Custo & Governança de Modelos
    PrRadar.tsx           # 6. Radar de PRs (Alertas)
    Projects.tsx          # 7. Status de Projetos
    Guardrails.tsx        # 8. Guardrails & Skills do Kiro
  mocks/
    seed.ts               # PRNG com seed (mulberry32)
    devs.ts squads.ts sprints.ts prs.ts stories.ts kiro.ts projects.ts milestones.ts
  lib/
    metrics.ts            # fórmulas (risk score, review esperado, aderência, etc.)
    format.ts             # formatação pt-BR (números, %, R$, durações)
public/
  guardrails/*.md         # arquivos para download (ver seção 6.8)
```

---

## 3. Direção visual ("front-end bonitão")

- **Dark mode como padrão** e light mode com toggle. Tokens em CSS variables no `:root` e em `[data-theme="dark"]`.
- Estética de **centro de controle**: fundo grafite profundo (`#0B0F14`), cards levemente elevados (`#121821`), bordas sutis (`#1F2937`) e um **acento único vibrante** (ciano-elétrico `#22D3EE`) para destaque e ações.
- Cores semânticas: verde `#34D399` (saudável), âmbar `#FBBF24` (atenção), vermelho `#F87171` (risco), violeta `#A78BFA` para tudo que for **"feito por IA"**. O violeta é a cor recorrente da IA em todos os gráficos.
- Números grandes em **JetBrains Mono**, tabular-nums.
- KPI cards com: valor, delta vs. período anterior (seta e cor) e sparkline.
- **Sidebar** fixa à esquerda com ícones e labels (colapsável). **Header** com: seletor de persona, filtros globais (Squad, Sprint, Período) e toggle de tema.
- Microanimações: contadores animando no load, cards com fade/slide escalonado e hover com leve glow do acento.
- Gráficos de linha temporal mostram **linhas verticais tracejadas nos marcos** "Dev Hub" (out) e "AI-DLC" (dez). Esse é o elemento visual-assinatura do produto.
- Responsivo: funciona em 1440px (demo em projetor) e em 768px. No mobile a sidebar vira drawer.
- Linguagem da UI: **português (pt-BR)**.

---

## 4. Modelo de dados (mock)

```ts
type Squad = { id: string; name: string; techLead: string; color: string };
// 8 squads: Pricing, Mídia, Vendas, Financeiro, Plataforma, Dados, Acadêmico, Portal do Aluno

type Dev = { id: string; name: string; avatarSeed: string; squadId: string;
  seniority: 'Jr' | 'Pl' | 'Sr' | 'Esp'; role: 'Dev' | 'Tech Lead' };
// ~48 devs mockados (nomes fictícios)

type Sprint = { id: string; name: string; start: string; end: string };
// 14 sprints quinzenais (de ~agosto do ano anterior até hoje), cobrindo antes e depois dos marcos

type Milestone = { id: string; label: string; date: string; description: string };
// "Dev Hub" (outubro), "Plataforma + AI-DLC" (dezembro)

type PullRequest = {
  id: string; number: number; repo: string; title: string;
  authorId: string; reviewerIds: string[]; squadId: string; sprintId: string;
  createdAt: string; mergedAt: string | null;
  linesAdded: number; linesRemoved: number; filesChanged: number;
  aiGeneratedPct: number;        // 0–100 (estimado via telemetria do Kiro)
  aiAssistedReview: boolean;     // revisão feita com apoio de IA
  reviewTimeMin: number;         // abertura → aprovação
  reviewComments: number;
  jiraKey: string | null;        // história vinculada
  jiraAdherence: number | null;  // 0–100: aderência PR × critérios de aceite (simula análise por LLM)
  adherenceNotes: string[];      // ex.: "Critério 2 (validação de CPF) não encontrado no diff"
  testsAdded: boolean; testCoverageDelta: number;
  ciStatus: 'passed' | 'failed';
  revertedOrHotfix: boolean;     // proxy de bug pós-merge
};

type Story = { key: string; title: string; squadId: string; sprintId: string;
  points: number; status: 'To Do' | 'In Progress' | 'Done';
  acceptanceCriteria: string[]; epicKey: string;
  specQuality: number;   // 0–100: clareza do PRD/spec (simula análise por IA)
  reopenCount: number;   // idas e vindas de requisito
};

type KiroUsage = { devId: string; date: string;
  model: 'Claude Haiku' | 'Claude Sonnet' | 'Claude Opus' | 'Claude Fable';
  taskType: 'commit' | 'explicar código' | 'gerar testes' | 'refatorar' | 'feature' | 'spec' | 'debug' | 'review';
  credits: number; tokensIn: number; tokensOut: number;
  accepted: boolean;          // sugestão aceita/mantida
  usedSkill: string | null;   // skill/steering usada
  specDriven: boolean;        // usou fluxo spec → design → tasks
};

type Epic = { key: string; name: string; squadId: string; owner: string;
  status: 'No prazo' | 'Atenção' | 'Atrasado' | 'Entregue';
  progressPct: number; plannedEnd: string; forecastEnd: string;
  risks: string[]; // riscos extraídos de reuniões/conversas (simulado)
};
```

**Regras do gerador (para os dados contarem uma história):**
- **Antes do AI-DLC:** PRs menores (média ~180 linhas), revisão média de ~45 min, `aiGeneratedPct` baixo (0–20%).
- **Depois do AI-DLC:** PRs maiores (média ~650 linhas, alguns > 3000), `aiGeneratedPct` alto (50–99%), **tempo de revisão caindo** (média ~12 min, vários < 1 min). Esse é o paradoxo.
- Lead time e throughput melhoram depois do AI-DLC, mas a **taxa de hotfix/revert sobe levemente** em 2 squads (Vendas e Mídia) onde `aiGeneratedPct` é alto **e** a revisão é curta. É a narrativa de risco.
- Squads com `aiAssistedReview = true` têm revisão curta **com** boa aderência. É o contraponto: "revisão rápida não é necessariamente ruim se for assistida".
- ~15% das chamadas do Kiro usam **Claude Opus/Fable para tarefas triviais** (commit, explicar código). É o desperdício a ser mostrado.

---

## 5. Fórmulas (`src/lib/metrics.ts`)

```ts
// Tempo de revisão esperado (heurística da liderança: ~30 min por 1.000 linhas, mínimo 10 min)
expectedReviewMin = max(10, (linesAdded + linesRemoved) / 1000 * 30)

// Razão de revisão (< 0.2 é suspeito)
reviewRatio = reviewTimeMin / expectedReviewMin

// PR Risk Score (0–100; quanto maior, mais arriscado)
risk =
  35 * clamp(1 - reviewRatio, 0, 1)                    // revisão rápida demais
+ 25 * (aiGeneratedPct / 100)                          // dependência de IA
+ 25 * (1 - (jiraAdherence ?? 50) / 100)               // não bate com a história
+ 10 * (testsAdded ? 0 : 1)                            // sem testes
+  5 * (size > 1000 ? 1 : 0)                           // PR gigante
- 15 * (aiAssistedReview ? 1 : 0)                      // atenuante: revisão assistida
// Faixas: 0–39 Saudável (verde) · 40–69 Atenção (âmbar) · 70+ Crítico (vermelho)

// Eficiência de uso do Kiro por dev (0–100)
efficiency =
  40 * acceptanceRate
+ 30 * modelFitRate      // % de chamadas com modelo adequado à tarefa (tabela abaixo)
+ 20 * specDrivenRate
+ 10 * skillUsageRate

// Modelo adequado por tarefa
commit, explicar código       → Haiku
gerar testes, refatorar, debug → Sonnet
feature, spec, review          → Sonnet ou Opus
Fable                          → só tarefas de arquitetura/spec complexas
// Custo desperdiçado = custo real − custo se tivesse usado o modelo adequado
```

---

## 6. Abas (rotas)

### 6.1 Visão Executiva — `/` *(para o VP)*
Responde à pergunta "a IA está mexendo nos ponteiros?".
- **Faixa de KPIs (6 cards):** Lead time médio (abertura → merge), Throughput (pontos/sprint), % de código gerado por IA, Tempo médio de revisão, Taxa de hotfix/revert (densidade de bug), Custo de IA no mês (R$).
- **Gráfico-assinatura:** linhas temporais por sprint (throughput, lead time, taxa de bug) com **marcos Dev Hub e AI-DLC** marcados.
- **Card "Antes × Depois do AI-DLC":** tabela comparativa com delta % e cor.
- **Card "Custo por ponto entregue"**: tendência por sprint (custo IA + custo time estimado ÷ pontos).
- **Card "Demanda atendida"**: histórias entregues vs. backlog crescendo. Reforça a narrativa da demanda reprimida.
- Botão **"Gerar resumo executivo"**: abre um Dialog com um texto mockado no estilo "update mensal para a diretoria" (bullets de destaques, riscos e próximos passos) e um botão "Copiar".

### 6.2 GitHub por Dev — `/github` *(obrigatória)*
- Filtros: Squad, Sprint, Senioridade, busca por nome.
- **Tabela de devs** (ordenável): Avatar e nome, Squad, **Qtd de PRs na sprint**, **Tempo médio de aprovação**, **Linhas por PR (média)**, Linhas totais (+/−), % IA médio, Comentários de review recebidos, Testes incluídos (%), Risk score médio (badge).
- Sparkline de PRs por sprint em cada linha.
- Clicar no dev abre um **Sheet lateral (perfil do dev)** com: evolução de PRs e linhas por sprint, distribuição do tempo de aprovação (histograma), lista dos últimos PRs com risk badge e comparação com a média do squad.
- Gráficos no topo: **scatter "Tamanho do PR × Tempo de revisão"** (pontos coloridos por % IA, mostrando o paradoxo; PRs grandes com revisão quase zero ficam destacados em vermelho no canto inferior direito) e barras de PRs por squad na sprint.
- Aviso discreto no rodapé: *"Métricas são para apoiar conversas, não para ranking punitivo. Commits/PRs ≠ valor entregue."*

### 6.3 GitHub × Jira — `/aderencia` *(obrigatória)*
- **KPIs:** Aderência média PR × história (%), **PRs por história (média)**, % de PRs sem história vinculada, Histórias reabertas (ida e vinda), Qualidade média de spec/PRD.
- **Tabela de histórias:** Key, Título, Squad, Pontos, Qtd de PRs vinculados, Aderência (barra de progresso colorida), Status, Reaberturas.
- Clicar na história abre um **Dialog "Auditoria da história"**: critérios de aceite em lista com status de cada um (✅ atendido / ⚠️ parcial / ❌ não encontrado no diff), PRs vinculados e notas da análise de IA (`adherenceNotes`). Selo "Analisado por IA". É o "auditor" pedido pela liderança.
- Gráficos: aderência média por squad (barras), distribuição de PRs por história (histograma: 1, 2–3, 4–6, 7+) e **correlação "qualidade da spec × aderência"** (scatter), mostrando que spec ruim gera entrega desalinhada.

### 6.4 Uso de IA (Kiro / AWS) — `/ia` *(obrigatória)*
Fonte futura: métricas de uso do Kiro disponíveis na AWS (**a validar quais campos a AWS expõe**). No protótipo, tudo é mock.
- **KPIs:** Devs ativos no Kiro (% da base), Taxa de aceitação de sugestões, % de uso spec-driven, Eficiência média, Skills mais usadas.
- **Ranking de eficiência** (top 10 e "precisam de apoio" bottom 5). Exibir como "**Destaques**" e "**Oportunidades de mentoria**", nunca como "piores".
- Card de destaque para os **Kiro Champions**: os 3 devs com melhor uso, com as práticas deles ("usa spec-driven em 90% das features", "usa Haiku para tarefas simples").
- Heatmap de **adoção por squad × semana**.
- Barras empilhadas de **tipo de tarefa × modelo usado**, destacando os casos de modelo inadequado.
- Perfil de uso por dev (Sheet): modelos usados, tarefas, aceitação, skills e sugestões personalizadas de melhoria.

### 6.5 Custo & Governança de Modelos — `/custo` *(adição)*
Baseada na dor "usar o modelo mais caro para pedir commit".
- **KPIs:** Custo do mês (R$), Projeção vs. orçamento (com alerta de **overage**), **Custo desperdiçado** (modelo inadequado), Custo por PR mergeado.
- Gráfico de área do custo diário, com a linha de orçamento.
- **Tabela "Desperdícios detectados"**: dev, tarefa, modelo usado → modelo recomendado, custo real × custo ideal, economia potencial.
- Card **"Tarefas que nem precisam de LLM"**: commit, contar linhas, formatar código, com volume e sugestão ("usar hook/skill determinística, custo R$ 0").
- Card de **política de roteamento** (visual, somente leitura): tabela tarefa → modelo recomendado.

### 6.6 Radar de PRs (Alertas) — `/radar` *(adição, destaque da demo)*
Feed para Tech Leads com os PRs que precisam de atenção.
- Lista de **cards de alerta** ordenados por risk score, cada um com: repo e #PR, autor, squad, **% IA**, **linhas**, **tempo de revisão real vs. esperado** ("aprovado em 30s, esperado ~90 min"), **aderência ao Jira** e motivos em chips ("Revisão 180× mais rápida que o esperado", "Critério 2 não atendido", "Sem testes").
- Ações mockadas: "Marcar como revisado", "Solicitar re-review", "Abrir no GitHub" (toast de confirmação).
- Filtro por faixa de risco e por squad. Contador no ícone da sidebar com o número de alertas críticos.
- Card explicativo **"Como o score é calculado"** (accordion com a fórmula da seção 5).
- Mock visual de um **check do GitHub Actions** ("RADAR / pr-risk: ⚠️ Atenção — score 74"), mostrando a ideia de bloquear no pipeline.

### 6.7 Status de Projetos — `/projetos` *(adição)*
Substitui a montagem manual do status mensal.
- Grid de **épicos** (cards) com: nome, squad, owner, barra de progresso, status (badge), previsão vs. planejado e riscos (chips).
- Visão **timeline/roadmap** simples (barras horizontais por épico).
- Resumo: entregues / no prazo / em atenção / atrasados.
- Painel **"Riscos detectados em reuniões"**: lista mockada de riscos extraídos de atas e conversas ("Dependência de infra para provisionar fila SQS — 3 menções na semana").
- Card **"Outer loop"**: tempo médio de chamados de infra e histórias reabertas por spec ruim.
- Botão **"Exportar status mensal"**: Dialog com o resumo pronto para apresentação.

### 6.8 Guardrails & Skills do Kiro — `/guardrails` *(obrigatória)*
Central de boas práticas com **arquivos .md para download**.
- Grid de cards, um por arquivo, com título, descrição, tags, data de atualização, botão **"Visualizar"** (Dialog com o markdown renderizado, via `react-markdown`) e **"Baixar .md"** (link para `/guardrails/<arquivo>.md` com atributo `download`).
- Botão **"Baixar todos"**: gerar um .zip no front com `jszip`, ou baixar em sequência.
- Seção "Quick wins": 5 dicas curtas em cards.

**Criar estes arquivos em `public/guardrails/`** com conteúdo real e útil (cada um com 30–80 linhas):

1. `01-escolha-de-modelo.md`: tabela tarefa → modelo; regra "nunca use o modelo mais caro para commit, formatação ou perguntas simples"; como trocar de modelo no Kiro.
2. `02-spec-driven-development.md`: fluxo requirements → design → tasks do Kiro; quando usar spec e quando usar vibe/chat; template de critérios de aceite (EARS / Dado-Quando-Então).
3. `03-steering-files.md`: como criar arquivos de steering em `.kiro/steering/` (padrões do projeto, stack, convenções); exemplos prontos de `product.md`, `tech.md` e `structure.md`.
4. `04-hooks-e-automacoes.md`: usar hooks do Kiro para tarefas determinísticas (lint, testes, mensagem de commit por template) **sem gastar LLM**.
5. `05-pr-e-revisao.md`: tamanho máximo recomendado de PR (~400 linhas), checklist de revisão de código gerado por IA, como declarar % de IA no PR e tempo mínimo de revisão.
6. `06-testes-no-ai-dlc.md`: harness de testes; pedir testes antes da implementação; cobertura mínima; não aceitar código sem teste.
7. `07-seguranca-e-dados.md`: não colar secrets/PII em prompts, revisar dependências sugeridas, cuidados com dados de alunos (LGPD).
8. `08-anti-padroes.md`: "IA como mordomo", aceitar diff sem ler, prompts vagos, conversas gigantes sem reset de contexto.

> Observação: valide os nomes de recursos do Kiro (steering, hooks, specs) na documentação oficial antes de apresentar.

---

## 7. Componentes compartilhados
- `KpiCard` (valor animado, delta, sparkline, tooltip com a definição da métrica)
- `TrendChart` (linha/área com `ReferenceLine` dos marcos)
- `RiskBadge` (Saudável / Atenção / Crítico)
- `AiPctBar` (barra violeta de % IA)
- `DevAvatar` (iniciais com cor determinística)
- `FilterBar` global (Squad, Sprint, Período) via Context. **Os filtros devem afetar todas as abas.**
- `PersonaSwitch`: muda a aba inicial e o destaque. VP abre em Visão Executiva, Tech Lead em Radar de PRs e Dev em GitHub por Dev filtrado no próprio usuário mock "Você".
- `MetricInfo`: ícone (i) com a explicação de cada métrica. Transparência é essencial para a adoção.
- Estados vazios elegantes quando o filtro não retorna dados.

---

## 8. Critérios de aceite do protótipo
- [ ] `npm run dev` sobe sem erros; nenhuma chamada de rede além das fontes.
- [ ] As 8 abas navegáveis pela sidebar, cada uma com rota própria.
- [ ] As 4 abas obrigatórias completas: **GitHub por Dev, GitHub × Jira, Uso de IA, Guardrails & Skills**.
- [ ] Os marcos Dev Hub e AI-DLC aparecem nos gráficos temporais.
- [ ] O scatter "Tamanho × Tempo de revisão" evidencia o paradoxo.
- [ ] O Radar de PRs mostra pelo menos 1 caso "99% IA, aprovado em 30s, não bate com o card".
- [ ] Downloads dos .md funcionam e os arquivos têm conteúdo real.
- [ ] Filtros globais funcionam em todas as abas.
- [ ] Dark/light mode, responsivo em 1440px e 768px.
- [ ] Toda a UI em pt-BR, números formatados em pt-BR (`Intl.NumberFormat('pt-BR')`).

## 9. Roteiro sugerido para o pitch (5 min)
1. **Visão Executiva:** "Depois do AI-DLC entregamos X% mais pontos e o lead time caiu Y%... mas olha a taxa de hotfix em Vendas."
2. **GitHub por Dev:** scatter do paradoxo: PRs gigantes aprovados em segundos.
3. **Radar de PRs:** o alerta "99% IA, 30s, não bate com o card".
4. **GitHub × Jira:** auditoria da história, critério a critério.
5. **Uso de IA + Custo:** "R$ Z/mês desperdiçados com modelo errado para tarefa trivial."
6. **Guardrails:** "E aqui o time aprende a usar melhor e baixa os guardrails."
7. Fechamento: *"IA não é para reduzir time; é para atender a demanda reprimida com qualidade. O RADAR prova isso."*

## 10. Próximos passos (fora do escopo do protótipo)
- Integrações reais: GitHub API (PRs, reviews), Jira API (histórias, épicos, critérios), métricas do Kiro na AWS.
- LLM para aderência PR × história e para qualidade de spec.
- Check no GitHub Actions com o risk score.
- Book de indicadores oficial da VP Tech, alimentado automaticamente (substituindo as planilhas manuais).
