# Requirements — DEMO-001 · Checkout: validar CPF e aplicar cupom

> ⚠️ **Spec de EXEMPLO do KiroCópter** (card fictício `DEMO-001`). Serve para mostrar o
> fluxo spec-driven do Kiro — requirements → design → tasks — que qualquer squad pode seguir.
> Não é uma feature real da VP Tech.

## Visão geral

No checkout da API de vendas, validar o CPF do comprador e aplicar o cupom de desconto
antes de fechar o pedido.

## Requisitos (EARS / Dado-Quando-Então)

### R1 — Validação de CPF
- QUANDO o comprador informar um CPF, O SISTEMA DEVE validar o dígito verificador.
- QUANDO o CPF for inválido, O SISTEMA DEVE recusar o checkout com mensagem clara.

### R2 — Aplicação de cupom válido
- DADO um cupom válido, QUANDO o pedido for fechado, ENTÃO o desconto DEVE ser aplicado ao total.

### R3 — Cupom expirado
- QUANDO o cupom estiver expirado, O SISTEMA DEVE recusar o cupom e manter o preço cheio.

### R4 — Testes
- O endpoint de checkout DEVE ter testes cobrindo CPF inválido e cupom expirado.

## Fora de escopo
- Meios de pagamento, antifraude, persistência do pedido.

## Critérios de pronto (DoD)
- [ ] R1 a R4 implementados e com evidência (código + teste).
- [ ] PR vinculado ao card, com % de IA declarada (ver template de PR do kit).
- [ ] Revisão compatível com o tamanho do PR.
