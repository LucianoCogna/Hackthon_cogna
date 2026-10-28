# RADAR · guia técnico

Aplicação web do RADAR. Visão geral do produto, perfis e roteiro de demo no [README principal](../README.md).

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check (tsc -b) + build de produção
npm run preview  # serve o build
```

As telas não fazem chamadas de rede (só as fontes do Google). Para rodar também as funções de `api/`, veja [API](#api-opcional).

## Estrutura

```
radar/
├── src/
│   ├── main.tsx              rotas
│   ├── app/
│   │   ├── store.tsx         sessão, perfis, filtros globais e useScope()
│   │   ├── Layout.tsx        sidebar, filtros, controle de acesso por perfil (NAV)
│   │   └── squadRegistry.ts  cadastro de squads (salvo no navegador)
│   ├── pages/                uma página por aba (+ Login, Profile, JiraIndicators, SquadsSection)
│   ├── components/           UI compartilhada (cards, gráficos, KPIs, overlays)
│   ├── lib/                  métricas, agregações e formatação
│   └── mocks/                gerador de dados simulados
├── shared/                   código usado pelo navegador e por api/
├── api/                      Vercel Functions (Jira e GitHub; fora de uso nas telas)
└── public/guardrails/        guardrails do AI-DLC em Markdown
```

## Rotas e acesso

| Rota | Aba | Quem acessa |
|---|---|---|
| `/` | Visão Executiva (o Dev vê só os próprios dados) | VP, Tech Lead, Dev |
| `/github` | GitHub por Dev | VP, Tech Lead |
| `/aderencia` | GitHub × Jira: Indicadores da sprint e Aderência PR × história | VP, Tech Lead |
| `/ia` | Uso de IA (o Dev vê só o próprio uso) | VP, Tech Lead, Dev |
| `/radar` | Radar de PRs | VP, Tech Lead |
| `/crew` | KiroCópter | VP, Tech Lead, Dev |
| `/perfil` | Meu perfil, com **Squads e integrações** (abre ao clicar no usuário na sidebar) | Todos; squads: VP (todos) e Tech Lead (o próprio) |

- O acesso por perfil fica em `NAV` (`src/app/Layout.tsx`). Uma rota fora do perfil redireciona para a página inicial dele.
- **Login de teste:** `vp@radar.teste`, `techlead@radar.teste` e `dev@radar.teste`, todos com a senha `radar123` (`TEST_USERS` em `src/app/store.tsx`). É um login de protótipo, feito no navegador, para demonstrar os perfis.
- O Tech Lead e o Dev ficam presos ao próprio squad no filtro. O Dev também tem os PRs e o uso do Kiro filtrados para ele (`useScope`).
- Os filtros globais (squad, período, sprint) valem para todas as abas.

## Dados simulados

- `src/mocks/*` usa um PRNG determinístico (mulberry32 com seed fixa): os mesmos dados a cada carga.
- 8 squads, 48 pessoas, 14 sprints quinzenais a partir de `SPRINT_ORIGIN` (04/08/2025, em `sprints.ts`). Marcos em `milestones.ts`: Dev Hub (01/10/2025) e AI-DLC (01/12/2025). O "hoje" do mock é `REF_DATE`.
- `jiraBoard.ts`: quadro no formato do Jira (itens, tipos, subtarefas, responsável e data de conclusão) para os indicadores de GitHub × Jira, com transbordo por squad.
- `devPoints.ts`: pontos de história por pessoa e sprint, coerentes com os PRs (~1 PR por ponto).
- Os números de referência vieram do Jira real do squad Pricing durante o hackathon (~1,2 PR por ponto e ~17% de transbordo).
- PR-herói da demo: `vendas-checkout-api #4821` (99% IA, aprovado em 30s, aderência de 22% ao card VEN-412).
- Squads cadastrados em Meu perfil entram em `squads` / `squadById` pelo `squadRegistry.ts`, depois que os geradores rodam, e ficam no `localStorage` (`radar.squads`).

## Fórmulas

Em `src/lib/metrics.ts`:

- **Revisão esperada:** 30 min por 1.000 linhas alteradas, mínimo de 10 min.
- **Risk score do PR (0–100):** 35 × revisão rápida demais + 25 × % de IA + 25 × (1 − aderência ao Jira) + 10 sem testes + 5 se passar de 1.000 linhas − 15 com revisão assistida por IA. Crítico a partir de 70.
- **Eficiência de uso do Kiro:** 40% aceitação + 30% modelo adequado à tarefa + 20% spec-driven + 10% uso de skills.
- **Indicadores da sprint** (`src/pages/JiraIndicators.tsx`): entrega = pontos concluídos dentro da sprint; conclusão = entregues ÷ comprometidos; transbordo = itens não concluídos na sprint. Subtarefas não somam pontos; cancelados ficam de fora.

## Design system

Tokens do **Martech Design System (Cogna)** em `src/index.css`, com tema claro (padrão) e escuro:

| Token | Claro | Escuro |
|---|---|---|
| Primary | `#4700C2` | `#C099FF` |
| Texto / secundário | `#1E1E1E` / `#757575` | `#FEF5FF` / `#A1A1AA` |
| Borda / superfície 2 | `#E8E8E8` / `#F2F2F2` | `#27272A` / `#1E1C2C` |
| Sidebar | `#F0F0F0`, item ativo em primary | `#151320` |
| Sucesso / erro | `#008564` / `#DD392D` | `#2FB487` / `#EF5B50` |
| Alerta em texto | `#D25D04` (chart-8, por contraste) | `#F28C3B` |
| "Feito por IA" | `#A97E19` (chart-10) | `#E6B93A` |

- Squads e séries usam a paleta de gráficos do DS (`chart-1…14`).
- Tipografia: Poppins e Roboto; JetBrains Mono para números.
- Raio de 8px. O wordmark Cogna (`src/components/CognaLogo.tsx`) herda a cor via `currentColor`.

## API (opcional)

Vercel Functions em [`api/`](api/). **As telas não chamam a API**: todos os dados são simulados, por segurança. As funções ficam prontas para quando a integração com o Jira e o GitHub for aprovada.

| Rota | O que faz |
|---|---|
| `GET /api/jira/health` | Confere credenciais, campo de critérios de aceite e acesso aos quadros |
| `GET /api/jira/board?squad=pricing&sprints=6` | Histórias e sprints reais do quadro do squad (cache de 5 min) |
| `GET /api/github/prs?squad=pricing&sprints=6` | PRs do squad; hoje simulados a partir do Jira (`source: "simulado"`) |

- **Acesso:** na Vercel, as rotas exigem o código `RADAR_ACCESS_CODE` no cabeçalho `x-radar-access` e respondem com `Cache-Control: private, no-store`. Rodando local, não pedem código.
- **Variáveis:** copie [`.env.example`](.env.example) para `.env.local` (`JIRA_USERNAME`, `JIRA_TOKEN`, `RADAR_ACCESS_CODE`, e opcionalmente `JIRA_BASE_URL` e `JIRA_AC_FIELD`). Nunca faça commit do `.env.local`.
- **Local:** `npm run dev` já executa as funções de `api/` por um plugin do Vite (`vite.config.ts`), sem `vercel dev`.
- Squads ligados ao Jira: `SQUAD_BOARDS` em `api/_lib/jira.ts` (hoje só Pricing, quadro 8075).
- Critérios de aceite: lidos do campo próprio do Jira ou da seção "Critérios de aceite" da descrição.
- `shared/`: código comum ao navegador e à API (o navegador não importa de `api/`).

## Deploy

Projeto `radar-cogna` na Vercel, ligado a este repositório com **Root Directory = `radar`**:

- cada merge na `main` publica em produção: https://radar-cogna.vercel.app
- cada PR ganha um deploy de preview, com o link comentado no PR
- `vercel.json` configura o build do Vite e o fallback de SPA (F5 em `/radar` não dá 404)

O CI do GitHub Actions roda type-check e build em cada PR e avisa quando o PR passa de 400 linhas.
