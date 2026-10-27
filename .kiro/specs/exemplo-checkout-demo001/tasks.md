# Tasks — DEMO-001 · Checkout: validar CPF e aplicar cupom

> ⚠️ Spec de EXEMPLO do KiroCópter (card fictício `DEMO-001`).
> Cada tarefa é pequena o bastante para virar um PR enxuto, uma tarefa por PR.

- [ ] 1. `validateCpf` — validação de dígito verificador do CPF
  - Implementar a função pura e os testes (válido, dígito errado, tamanho errado).
  - _Requisito: R1, R4_
  - _Modelo sugerido (kirocop-sugere-modelo): Sonnet (implementação) + Sonnet (testes)_

- [ ] 2. `applyCoupon` — aplicação de cupom com regra de expiração
  - Implementar a função pura e os testes (válido desconta, expirado mantém total).
  - _Requisito: R2, R3, R4_
  - _Modelo sugerido: Sonnet_

- [ ] 3. Integrar no `checkoutHandler`
  - Orquestrar validação → cupom → fechamento; mensagem de erro clara para CPF inválido.
  - _Requisito: R1, R2, R3_
  - _Modelo sugerido: Sonnet_

- [ ] 4. Revisão e PR
  - Abrir PR por tarefa, usando o template do kit (card vinculado + % de IA declarada).
  - Rodar `pr-auditor` e `jira-adherence` antes de pedir review.
  - _Modelo sugerido: Sonnet (review)_
