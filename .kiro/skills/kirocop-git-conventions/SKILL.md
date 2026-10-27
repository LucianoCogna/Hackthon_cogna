---
name: kirocop-git-conventions
description: Convenções universais de branch, commit e PR da VP Tech (KiroCópter). Use ao criar branch, escrever mensagem de commit ou abrir um PR. Cobre só nomenclatura e formato — NÃO impõe git flow, cada squad usa o seu.
---

# Convenções de Git — KiroCópter

Padroniza **a forma** de nomear e comentar, não o **fluxo** de branches. Cada squad da VP
Tech tem seu próprio git flow (quais branches, como promove para produção) — isso o kit
não toca. O que vale para todo mundo é como nomear a branch, escrever o commit e abrir o PR.

## Nomenclatura de branch

```
<tipo>/<CARD>-<slug-curto>
```

- `<tipo>`: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.
- `<CARD>`: a chave do Jira, qualquer prefixo (`CRPR-123`, `DENA-1046`, `PLAT-7`, ...).
- `<slug-curto>`: 2-4 palavras em kebab-case.

Exemplos: `feat/CRPR-123-validacao-cpf` · `fix/DENA-1046-lock-carga` · `chore/PLAT-7-bump-deps`

## Mensagem de commit (Conventional Commits)

```
<tipo>(<escopo opcional>): <descrição no imperativo>
```

- Exemplos: `feat(checkout): valida dígito verificador do CPF` ·
  `fix(carga): remove lock em tabela de fatos` · `docs: atualiza README do kit`.
- Descrição curta, imperativo ("adiciona", não "adicionado"). Detalhe no corpo, se preciso.
- Referencie o card no corpo ou no rodapé: `Refs CRPR-123`.

## Pull Request

- **Um card por PR**, uma tarefa da spec por PR quando possível.
- Preencher o template do kit (`.github/pull_request_template.md`): o que faz, card
  vinculado, **% de IA**, checklist e evidência.
- Vincular o card com `Closes <CARD>` (fecha ao mergear) ou `Refs <CARD>`.
- Antes de pedir review, rodar o `pr-auditor` e o `jira-adherence` do KiroCópter.

## O que esta skill NÃO define

- Quais branches a squad usa (develop, release, trunk, etc.) e como promove para produção.
- Política de merge (squash, rebase, merge commit).
- Isso é git flow de cada squad — fora do escopo do kit.
