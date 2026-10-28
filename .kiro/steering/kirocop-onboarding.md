---
name: kirocop-onboarding
description: Guia rápido de como usar o KiroCópter no dia a dia — qual agente chamar em cada situação. Carregue ao começar a usar o kit ou quando tiver dúvida de qual peça aplicar.
inclusion: manual
---

# KiroCópter — como usar no dia a dia

Guia de bolso do esquadrão. Em dúvida de qual peça usar, consulte a tabela.

## Qual agente chamar

| Situação | Agente | O que ele faz |
|---|---|---|
| "Peguei o card X, quero começar" | `analise-starter` | cria pasta + README no padrão, puxa o card, sugere o modelo por tarefa |
| "Esse PR bate com o card?" | `jira-adherence` | audita critério a critério, com evidência |
| "Esse PR é arriscado?" | `pr-auditor` | calcula o risk score e, se crítico, escreve o pedido de re-review |
| "Não sei por onde começar / quero que alguém roteie" | `kirocopter` | recebe o pedido e aciona o especialista certo |

A regra simples: **na dúvida, fale com o `kirocopter`** — ele direciona.

## O fluxo numa olhada

```
card do Jira ──> analise-starter ──> pasta + README + critérios de aceite
                                           │
                       implementação (você) + sugere-modelo por tarefa
                                           │
abrir o PR ──> template de PR (card + %IA) ──> jira-adherence + pr-auditor ──> review
```

## Jira: dois caminhos (nunca trava)

1. **Com MCP do Jira** — os agentes puxam o card direto.
2. **Sem MCP** — você cola o conteúdo do card, ou o agente usa o README local se já existir.

Qualquer prefixo funciona (`CRPR-`, `DENA-`, `PLAT-`, `DATA-`, ...). O kit detecta o padrão
`[A-Z]+-\d+` e classifica o tipo do card.

## Skills de apoio (os agentes já usam sozinhos)

- `kirocop-sugere-modelo` — qual modelo usar por tarefa (e quando não usar LLM).
- `kirocop-spec-ears` — como escrever/auditar critérios de aceite.
- `kirocop-revisao-pr` — checklist de revisão de PR com IA.
- `kirocop-git-conventions` — nomear branch, commit e PR (sem impor git flow).

## Experimente agora (sem risco)

Use a pasta `exemplo-demo/` (card e PR fictícios, prefixo `DEMO-`): peça ao `pr-auditor`
para avaliar o `DEMO-PR-1.diff`, e ao `jira-adherence` para auditá-lo contra o
`DEMO-001-card.md`. Veja o spec de exemplo em `.kiro/specs/exemplo-checkout-demo001/`.
