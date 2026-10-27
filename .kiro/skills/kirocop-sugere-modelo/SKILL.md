---
name: kirocop-sugere-modelo
description: Política de escolha de modelo por tarefa da VP Tech (KiroCópter). Use ANTES de executar uma tarefa para sugerir qual modelo usar e quando a tarefa nem precisa de LLM. Útil em trabalho de Jira (abrir a tarefa, implementar, documentar, validar) e para estimar desperdício de custo. Agnóstico de stack: vale para qualquer squad (backend, frontend, dados, mobile, infra).
---

# Sugere-modelo — política de modelo por tarefa

O Kiro no modo **Auto** já roteia o modelo por turno. Esta skill **não substitui** o Auto:
ela dá **transparência e governança** — diz qual modelo é adequado para a tarefa e, mais
importante, **quando a tarefa nem precisa de LLM**. Use como consultor antes de executar.

## Como usar (o agente faz isso antes de agir)

1. Classifique a tarefa que vai executar (ver tabela).
2. Diga em uma linha: `Tarefa: <tipo> → modelo sugerido: <modelo>` (ou "sem LLM").
3. Se a tarefa for determinística (commit, lint, formatar, contar linhas), **sugira o
   caminho sem LLM** (hook ou script) em vez de gastar modelo.
4. Só então execute.

## Tabela de roteamento

| Tarefa | Modelo sugerido | Também aceitável | Observação |
|---|---|---|---|
| commit / mensagem de commit | Haiku | — | ou hook determinístico (custo 0) |
| explicar código | Haiku | Sonnet | |
| formatar / lint / contar linhas | **sem LLM** | — | hook ou script |
| escrever/revisar código ou query | Sonnet | Opus | implementação da tarefa (qualquer stack) |
| gerar testes | Sonnet | — | |
| refatorar | Sonnet | — | |
| debug | Sonnet | Opus | |
| criar estrutura de pasta/README da tarefa | Haiku | Sonnet | tarefa de Jira, barata |
| feature | Sonnet | Opus | |
| spec / design / arquitetura | Opus | Sonnet, Fable | Fable só para spec/arquitetura complexa |
| review de PR | Sonnet | Opus | |

## Regras

- Nunca usar Opus ou Fable para commit, formatação ou pergunta simples.
- Fable só para arquitetura ou spec complexa.
- Commit, lint e formatação podem ser hook determinístico: **custo R$ 0**.
- Custo desperdiçado = custo real − custo com o modelo sugerido. Esse é o número que o
  RADAR mostra na aba Custo & Governança.

## Para tarefas de Jira (usado pelo analise-starter)

Ao abrir a tarefa a partir de um card, antes de cada passo o agente anuncia a sugestão.
Os exemplos abaixo são genéricos — adapte à stack da sua squad (backend, frontend, dados,
mobile, infra), o kit não assume nenhuma ferramenta específica:

- Criar a pasta e o README → Haiku (tarefa barata, estruturada).
- Puxar e resumir o card do Jira → Haiku/Sonnet.
- Implementar a tarefa (código, query, config, etc.) → Sonnet.
- Documentar decisões → Sonnet.
- Validar o resultado (teste, comparação, verificação) → Sonnet.

Assim o dev vê a recomendação e decide — governança sem tirar a escolha dele.
