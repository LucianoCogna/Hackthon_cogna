## O que muda

<!-- Descreva em 1–3 frases o que este PR faz e por quê. -->

Fecha #<!-- número da issue --> · Jira: <!-- ex.: RAD-42 (opcional) -->

## Tipo de mudança

- [ ] ✨ Feature (`feat`)
- [ ] 🐛 Correção (`fix`)
- [ ] ♻️ Refatoração (`refactor`)
- [ ] 🎨 Visual / design system (`style`)
- [ ] 📝 Documentação / guardrails (`docs`)
- [ ] 🔧 Build, CI, dependências (`chore`)

## Como testar

1. `cd radar && npm install && npm run dev`
2. Acesse <!-- rota, ex.: /radar -->
3. <!-- passos para validar -->

## Prints / GIF

<!-- Obrigatório para mudanças visuais: tema escuro e claro. -->

| Escuro | Claro |
|---|---|
|  |  |

## Uso de IA

- [ ] Este PR **não** usou IA
- [ ] Este PR usou IA. Ferramenta: <!-- Kiro / Claude / Copilot… --> · Aproximadamente ___% do diff
- [ ] Revisei linha a linha o código gerado e entendo o que ele faz

## Checklist

- [ ] PR com até ~400 linhas alteradas (sem contar `package-lock.json`)
- [ ] `npm run build` passa localmente (type-check + build)
- [ ] UI em pt-BR, com números formatados por `src/lib/format.ts`
- [ ] Usa os tokens do design system Cogna (sem cores fixas)
- [ ] Testado em 1440px e 768px, nos temas claro e escuro
- [ ] Respeita os filtros globais (`useScope()`), se aplicável
- [ ] Sem secrets, tokens ou dados pessoais reais

## Notas para o revisor

<!-- Pontos de atenção, decisões tomadas, trade-offs. -->
