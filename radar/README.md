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

| Rota | Aba | Persona |
|---|---|---|
| `/` | Visão Executiva | VP |
| `/github` | GitHub por Dev | Dev / TL |
| `/aderencia` | GitHub × Jira (auditoria da história) | TL |
| `/ia` | Uso de IA (Kiro) | todos |
| `/custo` | Custo & Governança de Modelos | VP |
| `/radar` | Radar de PRs (alertas) | TL |
| `/projetos` | Status de Projetos | VP / TL |
| `/guardrails` | Guardrails & Skills (downloads .md / .zip) | Dev |

O seletor de persona no header muda a aba inicial: VP abre a Visão Executiva, Tech Lead abre o Radar e Dev abre o GitHub por Dev filtrado em "Você".
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
