# RADAR · Inteligência de Engenharia

Protótipo **somente front-end** (dados mockados) para responder:
**"A adoção de IA (Kiro + AI-DLC) está realmente melhorando a engenharia, em velocidade, qualidade e custo?"**

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + build de produção
```

Nenhuma chamada de rede além das fontes do Google. GitHub, Jira e Kiro/AWS são simulados.

## Abas

| Rota | Aba | Quem acessa |
|---|---|---|
| `/` | Visão Executiva (o Dev vê só os próprios dados) | VP, Tech Lead, Dev |
| `/github` | GitHub por Dev | VP, Tech Lead |
| `/aderencia` | GitHub × Jira: Indicadores da sprint e Aderência PR × história | VP, Tech Lead |
| `/ia` | Uso de IA (Kiro) (o Dev vê só o próprio uso) | VP, Tech Lead, Dev |
| `/radar` | Radar de PRs (alertas) | VP, Tech Lead |
| `/crew` | KiroCópter (kit de agentes Kiro) | VP, Tech Lead, Dev |
| `/perfil` | Meu perfil (clique no seu usuário, no rodapé da sidebar), com a seção **Squads e integrações**: cadastro de squad com Jira, GitHub e Kiro | Todos; a seção de squads: VP (todos) e Tech Lead (o próprio) |

O Tech Lead vê os dados do próprio squad; o VP, de todos. Squads cadastrados ficam salvos no navegador (protótipo) e entram no filtro de squads.

### Login de teste e perfis

A tela inicial pede login. São três usuários de teste, todos com a senha `radar123`:

| Usuário | Perfil | O que vê |
|---|---|---|
| `vp@radar.teste` | VP | Todas as abas, todos os squads |
| `techlead@radar.teste` | Tech Lead (Pricing) | Todas as abas, com o filtro preso ao squad dele |
| `dev@radar.teste` | Dev (Portal do Aluno) | Visão Executiva e Uso de IA só com os próprios dados, e o KiroCópter |

É um login de protótipo, feito no navegador: serve para demonstrar os perfis, não para proteger dados. Os dados reais do Jira continuam protegidos pelo código de acesso da API (`RADAR_ACCESS_CODE`).
Os filtros globais (Squad, Período, Sprint) valem para todas as abas.

## Dados

- `src/mocks/*`: gerador determinístico (PRNG mulberry32 com seed fixa), com os mesmos dados a cada reload.
- A linha do tempo vai de `SPRINT_ORIGIN` (`src/mocks/sprints.ts`): 14 sprints quinzenais a partir de 04/08/2025.
  Marcos: Dev Hub em 01/10/2025 e AI-DLC em 01/12/2025. Para deslocar tudo, altere essa constante e as datas em `milestones.ts`.
- O PR-herói da demo é o `vendas-checkout-api #4821`: 99% IA, aprovado em 30s, aderência de 22% ao card VEN-412.
- Fórmulas (risk score, revisão esperada, eficiência, desperdício): `src/lib/metrics.ts`.

## Roteiro do pitch (5 min)

1. Visão Executiva → 2. GitHub por Dev (scatter do paradoxo) → 3. Radar de PRs (#4821) →
4. GitHub × Jira (auditoria VEN-412) → 5. Uso de IA + Custo → 6. Guardrails.

## Design system (Cogna)

Tokens em `src/index.css`, com a paleta extraída de cogna.com.br:

| Papel | Light | Dark |
|---|---|---|
| Primária (marca, ações) | `#5219A1` | `#A77BF3` |
| Sidebar | gradiente `#5219A1 → #3D127A` | gradiente `#28114B → #180B2C` |
| Destaque / "feito por IA" | `#C77D00` (amarelo escurecido para contraste) | `#FFAD01` |
| Item ativo da sidebar | `#FFAD01` | `#FFAD01` |
| Texto | `#2D3135` | `#F1ECF9` |
| Superfícies | `#FFFFFF` / `#F3EEFB` | `#1B1030` / `#24163F` |

Tipografia: **Poppins** (primária), Roboto (secundária) e JetBrains Mono para números.
O wordmark Cogna fica em `src/components/CognaLogo.tsx` e herda a cor via `currentColor`.

## Deploy (Vercel)

O projeto `radar-cogna` na Vercel está ligado a este repositório, com **Root Directory = `radar`**:

- cada merge na `main` publica em produção: https://radar-cogna.vercel.app
- cada PR ganha um deploy de preview automático, com o link comentado no PR

O `vercel.json` desta pasta configura o build do Vite e o fallback de SPA, para que um F5 em rotas como `/radar` não dê 404.

## Back-end (API)

Vercel Functions em [`api/`](api/). O token do Jira fica só no servidor; o navegador chama `/api/...`.

| Rota | O que faz |
|---|---|
| `GET /api/jira/health` | Confere as credenciais, o campo de critérios de aceite e o acesso aos quadros |
| `GET /api/jira/board?squad=pricing&sprints=6` | Histórias e sprints reais do quadro do squad (cache de 5 min) |
| `GET /api/github/prs?squad=pricing&sprints=6` | PRs do squad. **Hoje simulados a partir do Jira real** (`source: "simulado"`) enquanto o token do GitHub aguarda aprovação |

- **Acesso restrito:** as rotas `/api` exigem o código `RADAR_ACCESS_CODE` no cabeçalho `x-radar-access`. Nas telas com dados reais, quem não tiver o código vê um campo para digitá-lo, que fica salvo no navegador. O modo **Simulado** continua aberto. As respostas usam `Cache-Control: private, no-store`, para o CDN nunca servir dados reais a quem não tem o código.
- Squads ligados ao Jira ficam em `SQUAD_BOARDS` (`api/_lib/jira.ts`). Hoje só **Pricing** (quadro 8075).
- Critérios de aceite: vêm do campo próprio do Jira, descoberto pelo nome ou definido em `JIRA_AC_FIELD`. Se a história não tiver esse campo, são lidos da seção "Critérios de aceite" da descrição.
- Qualidade da spec: heurística determinística (critérios, formato testável, descrição, pontos, épico). Ainda sem LLM.
- **Local:** crie o `.env.local` a partir do [`.env.example`](.env.example) e rode `npm run dev`. Um plugin do Vite executa as funções de `api/`, sem precisar do `vercel dev`.
- O front-end não chama mais a API: todas as abas usam dados simulados, por segurança. Em **GitHub × Jira**, as sub-abas "Indicadores da sprint" e "Aderência PR × história" usam um quadro simulado no formato do Jira (`src/mocks/jiraBoard.ts`). Em **GitHub por Dev**, os pontos por pessoa vêm de `src/mocks/devPoints.ts`. As funções de `api/` continuam no repositório, protegidas pelo código de acesso.
- Rodando local (fora da Vercel), a API não pede o código de acesso.
- PRs simulados: cada história real gera PRs do responsável, na sprint dela, cerca de 1,2 PR por ponto (`api/_lib/githubSim.ts`). Quando o GitHub real entrar, o endpoint mantém o mesmo formato com `source: "github"`.
- `shared/`: código usado tanto pelo navegador quanto por `api/` (o navegador não pode importar de `api/`).
