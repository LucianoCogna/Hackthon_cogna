# 04 · Hooks e automações: o que não precisa de LLM

> Se a tarefa tem **uma resposta certa e previsível**, ela não precisa de um modelo.
> Ela precisa de um script.

## O problema

O RADAR mostra milhares de chamadas por mês para tarefas determinísticas: mensagem de commit,
formatação, contagem de linhas. Cada uma consome créditos e, muitas vezes, usa o modelo mais caro.

## Agent hooks do Kiro

Hooks disparam ações automaticamente a partir de eventos do IDE, como salvar, criar ou apagar
arquivos, ou um gatilho manual. Eles ficam versionados em `.kiro/hooks/`.

Use hooks **determinísticos** (que rodam um comando) sempre que possível, e hooks com agente
só quando a tarefa realmente exige raciocínio.

## Receitas sem LLM (custo R$ 0)

| Tarefa | Solução determinística |
|---|---|
| Formatar código | Prettier/ESLint `--fix` ao salvar |
| Lint e tipos | `tsc --noEmit` e `eslint` no pre-commit (husky + lint-staged) |
| Rodar testes afetados | `vitest related <arquivos>` ao salvar |
| Mensagem de commit | Template Conventional Commits + `commitizen` |
| Contar linhas / arquivos | `cloc`, `git diff --stat`, `wc -l` |
| Atualizar changelog | `changesets` ou `release-please` |
| Validar chave do Jira na branch | Script de pre-push com regex `^[A-Z]{2,4}-\d+` |

## Exemplo: commit sem LLM

`.husky/prepare-commit-msg`:

```bash
#!/bin/sh
BRANCH=$(git rev-parse --abbrev-ref HEAD)
KEY=$(echo "$BRANCH" | grep -oE '[A-Z]{2,4}-[0-9]+' | head -1)
if [ -n "$KEY" ] && ! grep -q "$KEY" "$1"; then
  sed -i.bak "1s/^/[$KEY] /" "$1"
fi
```

Resultado: `[VEN-412] feat(checkout): valida CPF antes de gerar pedido`, sem nenhuma chamada ao modelo.

## Quando um hook com agente vale a pena

- Atualizar a documentação de uma API quando o contrato OpenAPI muda.
- Sugerir testes para um arquivo novo, **usando o modelo intermediário**.
- Revisar um diff contra o checklist de segurança antes do push.

Mesmo nesses casos:

1. Fixe o **modelo adequado** no prompt do hook (veja `01-escolha-de-modelo.md`).
2. Limite o escopo aos arquivos alterados.
3. Peça uma saída curta e estruturada (lista, JSON).

## Checklist

- [ ] Formatação e lint rodam automaticamente, sem LLM.
- [ ] Commits seguem um template determinístico.
- [ ] Hooks com agente usam o modelo mais barato que resolve.
- [ ] Os hooks estão versionados e foram revisados em PR.

> Confira a sintaxe e os eventos disponíveis na documentação oficial de hooks do Kiro.
