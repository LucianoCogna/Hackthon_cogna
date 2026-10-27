---
name: kirocop-spec-ears
description: Template de critérios de aceite EARS e Dado-Quando-Então (KiroCópter). Use ao escrever ou auditar os critérios de aceite de uma história/card do Jira.
---

# Critérios de aceite — EARS e Dado-Quando-Então

Critérios bem escritos são verificáveis no diff ou em um teste. Use este template ao abrir
uma análise a partir de um card e ao auditar um PR contra o card.

## Formatos

- **EARS:** `QUANDO <evento/condição>, O SISTEMA DEVE <resposta observável>.`
- **Dado-Quando-Então:** `DADO <contexto>, QUANDO <ação>, ENTÃO <resultado observável>.`

## Regras

- Um comportamento por critério. Nada de critério que esconde três regras.
- Cada critério tem que ser **verificável**: dá para apontar o trecho do código/diff ou um
  teste que prova que foi atendido.
- Evitar critério vago ("o sistema deve ser rápido"). Trocar por mensurável ("a resposta
  deve voltar em até 2s para 95% das chamadas").
- O template é **agnóstico de stack**: o que é "verificável" muda com a squad — um teste,
  um trecho de código, uma resposta de API, uma tela, uma validação de dados.

## Exemplos por tipo de squad

- **Backend / API:** QUANDO o CPF informado for inválido, O SISTEMA DEVE responder 422 com
  mensagem de erro clara.
- **Frontend:** DADO o formulário de checkout, QUANDO o cupom expirar, ENTÃO o campo DEVE
  exibir "cupom expirado" e manter o preço cheio.
- **Dados:** DADO a tabela de fatos, QUANDO a carga do dia rodar, ENTÃO não deve haver
  chave duplicada; e a contagem de linhas deve bater entre os ambientes.
- **Infra:** QUANDO o deploy terminar, O SISTEMA DEVE expor o health-check retornando 200.
