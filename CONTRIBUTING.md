# Como contribuir com o RADAR

Obrigado por contribuir! Este guia define o padrão de branches, commits e Pull Requests do projeto.
Ele segue as mesmas boas práticas que o RADAR mede: **PRs pequenos, revisão de verdade e uso de IA declarado.**

## 1. Antes de começar

1. Procure uma [issue](../../issues) existente ou abra uma nova (bug ou feature).
2. Comente na issue que vai trabalhar nela, para evitar trabalho duplicado.
3. Rode o projeto localmente:

```bash
cd radar
npm install
npm run dev     # http://localhost:5173
```

## 2. Branches

Sempre crie a branch a partir de `main` atualizada:

```bash
git checkout main && git pull
git checkout -b <tipo>/<descricao-curta>
```

| Tipo | Uso | Exemplo |
|---|---|---|
| `feat/` | nova funcionalidade | `feat/filtro-por-repositorio` |
| `fix/` | correção de bug | `fix/delta-kpi-sem-periodo` |
| `refactor/` | mudança sem alterar comportamento | `refactor/extrai-hook-scope` |
| `docs/` | documentação e guardrails | `docs/guardrail-observabilidade` |
| `style/` | visual / design system | `style/tokens-cogna-dark` |
| `chore/` | build, dependências, CI | `chore/atualiza-recharts` |

Se houver card no Jira, inclua a chave: `feat/RAD-42-filtro-por-repositorio`.

## 3. Commits ([Conventional Commits](https://www.conventionalcommits.org/pt-br/))

```
<tipo>(<escopo opcional>): <descrição no imperativo, em minúsculas>
```

Exemplos:

```
feat(radar): adiciona filtro por repositório nos alertas
fix(overview): corrige delta quando não há período anterior
docs(guardrails): adiciona guia de observabilidade
style(ds): ajusta contraste do amarelo Cogna no tema claro
```

- Um commit por mudança lógica. Evite "ajustes" e "wip" no histórico final.
- Escopos sugeridos: `overview`, `github`, `jira`, `ia`, `custo`, `radar`, `projetos`, `guardrails`, `mocks`, `ds`, `ci`.

## 4. Pull Requests

### Regras

- **Até ~400 linhas alteradas por PR** (sem contar `package-lock.json`). Maior que isso, quebre em PRs menores.
- **Um assunto por PR.**
- **O CI precisa passar** (type-check + build). Veja `.github/workflows/ci.yml`.
- **Pelo menos 1 aprovação** de outra pessoa antes do merge.
- **Declare o uso de IA** no template do PR (Kiro, Claude, Copilot…) e revise linha a linha o código gerado.
- **Inclua print ou GIF** em toda mudança visual, nos temas claro e escuro.
- Merge com **Squash and merge**, usando o título do PR no padrão Conventional Commits.

### Tempo mínimo de revisão (heurística do RADAR)

| Linhas alteradas | Revisão esperada |
|---|---|
| até 333 | 10 min |
| 500 | 15 min |
| 1.000 | 30 min |

Aprovar um PR grande em segundos é exatamente o padrão que o RADAR alerta. Revise de verdade.

### Checklist do revisor

- [ ] A mudança resolve o que a issue/descrição pede?
- [ ] O código segue os padrões existentes (nomes, estrutura de pastas, tokens do design system)?
- [ ] Não há cores fixas no código: use os tokens de `src/index.css` (`bg-accent`, `text-muted`, `var(--ai)`…).
- [ ] Textos da UI em **pt-BR** e números formatados com os helpers de `src/lib/format.ts`.
- [ ] Funciona em 1440px e 768px, nos temas claro e escuro.
- [ ] Os dados continuam determinísticos (mocks usam o PRNG de `src/mocks/seed.ts`, nunca `Math.random()`).
- [ ] Nenhum secret, token ou dado pessoal real no código ou nos mocks.

## 5. Padrões de código

- **Stack:** Vite + React 18 + TypeScript (strict) + Tailwind v4 + Recharts.
- **Pastas:** páginas em `src/pages`, componentes compartilhados em `src/components`, fórmulas em `src/lib/metrics.ts`, mocks em `src/mocks`.
- **Design system Cogna:** use os tokens. Roxo `--accent` para marca e ações; amarelo `--ai` para "feito por IA"; `--ok`, `--warn` e `--risk` só para status.
- **Gráficos:** sem eixo duplo, legenda quando houver 2 ou mais séries, e marcos Dev Hub/AI-DLC em séries temporais (`milestoneLines()`).
- **Filtros globais:** toda nova aba deve usar `useScope()` para respeitar Squad, Período e Sprint.

## 6. Reportando bugs e sugerindo features

Use os templates em **Issues → New issue**. Para bugs, inclua passos para reproduzir, o resultado esperado e prints.

## Dúvidas

Abra uma issue com a label `question` ou fale com @LucianoCogna.
