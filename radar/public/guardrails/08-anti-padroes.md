# 08 · Anti-padrões no uso de IA

Os erros mais comuns que o RADAR encontra, e o que fazer no lugar.

## 1. IA como mordomo

**Sintoma:** pedir ao modelo de topo coisas como "faz o commit", "qual a data de hoje?",
"formata esse arquivo", "conta quantas linhas tem".

**Por que é ruim:** custa caro, é lento e não exige inteligência nenhuma.

**Faça assim:** use hooks e scripts determinísticos (`04-hooks-e-automacoes.md`) e o modelo
leve para perguntas simples (`01-escolha-de-modelo.md`).

## 2. Aceitar o diff sem ler

**Sintoma:** "Accept all" em um diff de 1.500 linhas e PR aberto em seguida.

**Por que é ruim:** você vira o responsável por um código que não conhece. É assim que surgem
PRs "99% IA, aprovados em 30 segundos".

**Faça assim:** execute uma task da spec por vez, leia cada diff e rode os testes antes de aceitar.

## 3. Prompts vagos

**Sintoma:** "melhora esse código", "faz a tela de checkout".

**Por que é ruim:** o modelo preenche as lacunas com suposições, e a entrega não bate com o card.

**Faça assim:** dê contexto, restrições e critério de pronto.

```
Ruim:  faz a validação do checkout
Bom:   No CheckoutService (src/features/checkout), valide o CPF do comprador antes
       de criar o pedido (critério 2 da VEN-412). Use o validador de shared/validators/cpf.ts.
       Retorne erro 422 com a mensagem "CPF inválido". Inclua testes Vitest.
```

## 4. Conversas gigantes sem reset de contexto

**Sintoma:** a mesma conversa há 3 dias, com 200 mensagens, misturando 4 assuntos.

**Por que é ruim:** o contexto fica poluído, o modelo "esquece" ou mistura instruções, e cada
mensagem custa mais tokens.

**Faça assim:** uma conversa por assunto. Ao trocar de tarefa, abra uma nova sessão e use
steering files e specs para carregar o contexto persistente.

## 5. Pular a spec

**Sintoma:** ir direto do card do Jira para "implementa isso".

**Por que é ruim:** sem requisitos revisados, você descobre o desalinhamento só no review,
ou em produção.

**Faça assim:** para qualquer coisa com mais de 1 dia de trabalho, siga o fluxo
requirements → design → tasks (`02-spec-driven-development.md`).

## 6. PR monolítico

**Sintoma:** uma feature inteira em um PR de 3.000 linhas.

**Faça assim:** um PR por task, até ~400 linhas (`05-pr-e-revisao.md`).

## 7. Confiar em APIs "plausíveis"

**Sintoma:** o código chama `utils.formatCurrencyBR()`, que não existe no projeto.

**Faça assim:** confirme que tudo que o código usa existe de verdade. Rode build e testes.

## 8. Medir valor por volume

**Sintoma:** comemorar "geramos 40 mil linhas com IA este mês".

**Por que é ruim:** linhas e commits não são valor entregue. Mais código é mais manutenção.

**Faça assim:** acompanhe throughput, lead time, aderência ao requisito e taxa de hotfix no RADAR.

---

> **IA não serve para reduzir time.** Serve para atender a demanda reprimida **com qualidade**.
