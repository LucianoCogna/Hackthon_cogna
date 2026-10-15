# 03 · Steering files: ensine o Kiro sobre o seu projeto

Steering files são arquivos Markdown em `.kiro/steering/` que dão ao Kiro um conhecimento
persistente sobre o projeto: padrões, stack e convenções. Sem eles, você repete as mesmas
instruções em todo prompt.

```
.kiro/steering/
├── product.md     # propósito, usuários, regras de negócio
├── tech.md        # stack, bibliotecas, comandos, restrições
└── structure.md   # organização de pastas, nomes, arquitetura
```

## Modos de inclusão

No topo do arquivo, um front matter controla quando o steering é carregado:

```markdown
---
inclusion: always            # sempre (padrão)
---
```

```markdown
---
inclusion: fileMatch
fileMatchPattern: "src/api/**/*.ts"   # só quando arquivos da API estão no contexto
---
```

```markdown
---
inclusion: manual            # só quando referenciado com #nome-do-arquivo no chat
---
```

## Exemplo: `product.md`

```markdown
# Produto: Portal do Aluno
- Público: alunos de graduação EAD e presencial (18–45 anos), majoritariamente mobile.
- Objetivo: autoatendimento (boletos, documentos, notas) e redução de chamados.
- Regras: dados de alunos são pessoais (LGPD). Nunca logar CPF, e-mail ou telefone.
- Tom: linguagem simples, sem jargão acadêmico, mensagens de erro acionáveis.
```

## Exemplo: `tech.md`

```markdown
# Stack
- Front: React 18 + TypeScript + Vite; estilos com Tailwind.
- BFF: Node 20 + Fastify; validação com zod.
- Testes: Vitest + Testing Library; cobertura mínima de 80% nas linhas alteradas.
- Comandos: `pnpm dev`, `pnpm test`, `pnpm lint`.
- Proibido: novas dependências sem aprovação do Tech Lead; `any` explícito.
```

## Exemplo: `structure.md`

```markdown
# Estrutura
- src/features/<feature>/  → componentes, hooks e testes da feature, juntos.
- src/shared/              → componentes e utilitários reutilizáveis.
- Nomes: componentes em PascalCase, hooks com prefixo `use`, testes `*.test.ts`.
- Toda chamada HTTP passa por src/shared/api/client.ts (retry e correlation-id).
```

## Boas práticas

- Mantenha cada arquivo **curto e objetivo**. Steering é contexto, não documentação completa.
- Versione os steering files no repositório e revise as mudanças em PR.
- Use os **templates corporativos** do Dev Hub (`steering-padroes-edu`) como ponto de partida.
- Atualize o steering quando uma revisão de PR apontar o mesmo problema duas vezes.
- Nunca coloque secrets, tokens ou dados pessoais em steering files.

> Valide os nomes e opções na documentação oficial do Kiro: os recursos evoluem rápido.
