# 05 · PRs e revisão de código gerado por IA

> "Esse PR: 99% feito por IA, aprovado em 30 segundos e não bate com o card do Jira."
> É exatamente o que este guardrail existe para evitar.

## Tamanho máximo recomendado

- **Até ~400 linhas alteradas por PR.** Acima disso a qualidade da revisão cai bastante.
- PRs acima de 1.000 linhas recebem alerta no RADAR e precisam de justificativa.
- Quebre features grandes usando as tasks da spec: **uma task, um PR**.

## Tempo mínimo de revisão

Heurística da liderança: **~30 min por 1.000 linhas, mínimo de 10 min.**

| Linhas alteradas | Revisão esperada |
|---|---|
| até 333 | 10 min |
| 500 | 15 min |
| 1.000 | 30 min |
| 3.000 | 90 min |

Se a revisão levou menos de **20% do esperado**, o check `RADAR / pr-risk` marca o PR.

## Declare o uso de IA no PR

Adicione ao template de PR (`.github/pull_request_template.md`):

```markdown
## Uso de IA
- [ ] Código gerado com apoio do Kiro (~__% do diff)
- [ ] Revisei linha a linha o código gerado
- [ ] Spec/tarefa de origem: VEN-___

## Critérios de aceite
- [ ] Critério 1 …
- [ ] Critério 2 …
```

## Checklist de revisão de código gerado por IA

- [ ] **Bate com a história?** Confira cada critério de aceite no diff.
- [ ] **Escopo:** há arquivos alterados fora do escopo da história?
- [ ] **Testes:** existem testes para os critérios, e eles falham sem a mudança?
- [ ] **Dependências:** alguma biblioteca nova? Ela existe, é mantida e tem licença compatível?
- [ ] **Segurança:** validação de entrada, autorização, nada de secrets ou PII em logs.
- [ ] **Código "plausível":** nomes e APIs que parecem certos, mas não existem no projeto.
- [ ] **Tratamento de erro:** sem `catch` vazio, sem fallback silencioso.
- [ ] **Duplicação:** a IA recriou algo que já existe em `shared/`?

## Revisão assistida por IA: pode, com método

Revisão rápida não é necessariamente ruim. Os squads que usam **revisão assistida**
(skill `revisao-pr-checklist`) revisam em ~10 min e mantêm aderência acima de 85%.

1. Rode a skill de revisão no diff e leia os apontamentos.
2. Verifique você mesmo os critérios de aceite. A IA ajuda, mas não aprova.
3. Registre no PR que a revisão foi assistida. O RADAR usa isso como atenuante.

## O que o Tech Lead recebe

Score ≥ 70 gera alerta no **Radar de PRs**. O TL pode marcar como revisado, pedir re-review
ou registrar uma justificativa para liberar o merge.
