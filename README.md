# RADAR · Inteligência de Engenharia

> **A IA está fazendo a engenharia entregar melhor, ou só entregar mais?**

O RADAR é um painel que mostra se o uso de IA no desenvolvimento (Kiro + AI-DLC) está trazendo resultado de verdade para a VP Tech da Cogna. Ele cruza o **Jira** (o que foi pedido e prometido), o **GitHub** (o que foi entregue no código) e o **uso do Kiro na AWS**, por squad, por sprint e por pessoa.

**No ar:** https://radar-cogna.vercel.app · Projeto do Hackathon Cogna.

---

## O problema

Com assistentes de IA, sobem mais PRs e mais linhas de código. Mas a liderança não consegue responder:

- Esse volume virou **valor entregue** (pontos de história, demanda atendida)?
- As **revisões** continuam sérias, ou PRs gigantes feitos por IA são aprovados em segundos?
- O código atende ao que a **história do Jira** pediu?
- O **custo** do Kiro está indo para o modelo certo em cada tarefa?

Hoje essas respostas vêm de planilhas manuais, quando vêm.

## A solução

| Aba | Pergunta que responde |
|---|---|
| **Visão Executiva** | Os ponteiros mexeram? Lead time, throughput, % de código por IA, revisão, hotfix e custo, antes e depois dos marcos Dev Hub e AI-DLC. Gera o resumo executivo para a diretoria. |
| **GitHub por Dev** | Quem está entregando, e como? Pontos de história ao lado dos PRs, tamanho, tempo de aprovação, % de IA e risco por pessoa. Mostra o "paradoxo": PR grande com revisão relâmpago. |
| **GitHub × Jira** | O código bate com a história? **Indicadores da sprint** (entrega, conclusão, transbordo, burndown, pontos por dev e por tipo de item) e **Aderência PR × história** (critérios de aceite atendidos, qualidade da spec, onde estão os critérios). |
| **Uso de IA** | Como o time usa o Kiro? Aceitação, uso spec-driven, modelo adequado por tarefa, skills, Kiro Champions e oportunidades de melhoria. |
| **Radar de PRs** | Quais PRs precisam do seu olhar agora? Fila ordenada por risk score, com prévia do check no GitHub Actions e ações de revisão. |
| **KiroCópter** | O que fazer a respeito? Kit de agentes, skills e hook do Kiro que age sobre o que o RADAR encontra (detalhes em [`.kiro/README.md`](.kiro/README.md)). |
| **Meu perfil** | Dados de quem entrou e o cadastro de **Squads e integrações**: liga cada squad ao quadro do Jira, aos repositórios do GitHub e ao uso do Kiro. |

### Perfis de acesso

Cada perfil vê o que faz sentido para ele:

| Perfil | O que vê |
|---|---|
| **VP** | Todas as abas, todos os squads; cadastra squads |
| **Tech Lead** | Todas as abas, com os dados do próprio squad; edita as integrações do squad |
| **Dev** | Só os próprios números (Visão Executiva e Uso de IA) e o KiroCópter |

## Como testar

Abra https://radar-cogna.vercel.app e entre com um dos usuários de teste (senha `radar123` para todos), ou clique no cartão do usuário na tela de login:

| Usuário | Perfil |
|---|---|
| `vp@radar.teste` | VP |
| `techlead@radar.teste` | Tech Lead do squad Pricing |
| `dev@radar.teste` | Dev do squad Portal do Aluno |

**Roteiro sugerido (5 min):** Visão Executiva → GitHub por Dev (gráfico do paradoxo) → Radar de PRs (PR `vendas-checkout-api #4821`: 99% IA, aprovado em 30s) → GitHub × Jira (auditoria da história VEN-412) → Uso de IA → Meu perfil (cadastrar um squad e testar as conexões) → KiroCópter.

## Dados

Todo o app usa **dados simulados e determinísticos** (os mesmos a cada carga), com 8 squads, 48 pessoas e 14 sprints. Não há conexão com Jira, GitHub ou AWS na tela, por segurança.

Durante o hackathon, o back-end chegou a ler o **Jira real do squad Pricing**. Os indicadores e as proporções do mock foram calibrados com esses números (por exemplo, ~1,2 PR por ponto de história e ~17% de transbordo por sprint). As funções de API continuam no repositório, protegidas por código de acesso, prontas para ligar quando a integração for aprovada.

## Rodar localmente

```bash
cd radar
npm install
npm run dev     # http://localhost:5173
npm run build   # type-check + build de produção
```

Detalhes técnicos (estrutura, dados, fórmulas, API e deploy) em [`radar/README.md`](radar/README.md).

## Stack

Vite · React 18 · TypeScript · Tailwind CSS v4 · Recharts · Radix UI · Vercel (hosting e Functions). Design system: tokens do Martech Design System da Cogna.

## Repositório

| Caminho | Conteúdo |
|---|---|
| [`radar/`](radar/) | Aplicação web e API |
| [`.kiro/`](.kiro/) | Kit KiroCópter: agentes, skills, hook e spec de exemplo |
| [`radar-engenharia-spec.md`](radar-engenharia-spec.md) | Spec original do protótipo |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Padrão de branches, commits e PRs |

## Contribuindo

Leia o [guia de contribuição](CONTRIBUTING.md): branches por tipo, Conventional Commits, PRs de até ~400 linhas com o uso de IA declarado no template, e o CI (type-check + build) que precisa passar. Cada PR ganha um deploy de preview na Vercel; cada merge na `main` vai para produção.
