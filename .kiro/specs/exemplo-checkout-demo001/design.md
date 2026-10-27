# Design — DEMO-001 · Checkout: validar CPF e aplicar cupom

> ⚠️ Spec de EXEMPLO do KiroCópter (card fictício `DEMO-001`).

## Abordagem

Isolar duas regras puras e plugá-las no handler do checkout. Funções puras são fáceis de
testar (atende R4) e não acoplam a validação ao framework.

## Componentes

| Componente | Responsabilidade | Requisito |
|---|---|---|
| `validateCpf(cpf): boolean` | valida dígito verificador do CPF | R1 |
| `applyCoupon(total, coupon): number` | aplica desconto; expirado mantém total | R2, R3 |
| `checkoutHandler` | orquestra: valida CPF → aplica cupom → fecha pedido | R1–R3 |

## Fluxo

1. Recebe payload com CPF e cupom.
2. `validateCpf` → se inválido, responde erro claro (R1).
3. `applyCoupon` → se expirado, mantém total (R3); senão aplica desconto (R2).
4. Fecha o pedido com o total final.

## Decisões

- **Funções puras, sem dependência de framework** — testáveis e reutilizáveis. Alternativa
  (validar dentro do controller) foi descartada por dificultar o teste de R4.
- Mensagens de erro em pt-BR, legíveis para o usuário final.

## Teste (R4)

- `validateCpf`: caso válido, dígito errado, tamanho errado.
- `applyCoupon`: cupom válido aplica desconto; cupom expirado mantém total.
- handler: CPF inválido retorna erro; cupom expirado não desconta.
