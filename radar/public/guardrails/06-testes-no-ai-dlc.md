# 06 · Testes no AI-DLC

> **Não aceite código sem teste.** Com IA, escrever código ficou barato; validar que ele está
> certo continua sendo trabalho seu, e os testes são a forma mais barata de fazer isso.

## Princípios

1. **Testes antes da implementação.** Peça ao Kiro os testes a partir dos critérios de aceite
   *antes* de pedir o código. O teste vira a especificação executável.
2. **Um critério de aceite = pelo menos um teste.** A rastreabilidade é o que permite auditar a aderência.
3. **O teste tem que falhar sem a mudança.** Teste que sempre passa não prova nada.
4. **Cobertura mínima de 80% nas linhas alteradas**, não no projeto inteiro.

## Harness de testes

Antes de usar IA em escala, garanta que o repositório tem:

- [ ] Comando único para rodar tudo: `pnpm test` (ou equivalente).
- [ ] Testes rápidos (unitários < 1 min) para rodar a cada mudança.
- [ ] Fixtures e factories para dados de teste, **sem dados reais de alunos**.
- [ ] Mocks padronizados para integrações externas (banco, pagamentos, CRM).
- [ ] Relatório de cobertura das linhas alteradas no CI (`diff-cover` ou similar).
- [ ] Steering `tech.md` descrevendo o framework e as convenções de teste.

## Prompt recomendado (modelo intermediário)

```
Com base nos critérios de aceite da história VEN-412 (requirements.md),
escreva testes Vitest para o serviço CheckoutService.
- Um `describe` por critério, com o número do critério no nome.
- Inclua casos de borda: CPF inválido, cupom expirado, total zerado.
- Não implemente o serviço; os testes devem falhar agora.
```

## Fluxo no AI-DLC

```
história (Jira) → requirements.md → testes (falhando) → implementação → testes passando → PR
```

## Sinais de alerta

- O PR adiciona 2.000 linhas e nenhum teste: o RADAR soma +10 no risk score.
- Os testes gerados só verificam se a função "não lança erro".
- Snapshots enormes aceitos sem leitura.
- Mocks que reimplementam a lógica que deveriam testar.
- A cobertura caiu (`testCoverageDelta` negativo) em um PR de feature.

## Skill corporativa

Use a skill **`gerar-testes-jest`** (ou a versão Vitest do seu squad). Ela já conhece os padrões
de factories e mocks da VP Tech e usa o modelo adequado.

## Métricas no RADAR

- % de PRs com testes incluídos, por dev e por squad.
- Variação de cobertura por PR.
- Correlação entre PRs sem teste e hotfix/revert.
