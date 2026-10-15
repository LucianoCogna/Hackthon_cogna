# 01 · Escolha de modelo no Kiro

> **Regra de ouro:** nunca use o modelo mais caro para commit, formatação ou perguntas simples.
> O modelo certo é o mais barato que resolve a tarefa com qualidade.

## Por que isso importa

- Cerca de **15% das chamadas** da VP Tech usam modelos de topo (Opus/Fable) em tarefas triviais.
- Uma mensagem de commit custa até **40× mais** no modelo de topo do que no modelo leve, com o mesmo resultado.
- O desperdício consome o orçamento de licenças e gera **overage** no fim do mês.

## Tabela de roteamento (política v1.2)

| Tarefa | Modelo recomendado | Também aceito | Nunca use |
|---|---|---|---|
| Mensagem de commit | Haiku | — | Opus, Fable |
| Explicar um trecho de código | Haiku | Sonnet | Opus, Fable |
| Gerar testes unitários | Sonnet | — | Fable |
| Refatorar | Sonnet | — | Fable |
| Debug com stack trace | Sonnet | Opus (casos difíceis) | Fable |
| Implementar feature | Sonnet | Opus | Fable |
| Escrever spec / design | Opus | Sonnet, Fable (arquitetura complexa) | — |
| Review de PR grande | Sonnet | Opus | Fable |

> Os nomes dos modelos seguem a política interna. Confira na sua conta quais modelos o Kiro disponibiliza
> e qual é o custo de cada um (créditos por interação).

## Perguntas rápidas antes de escolher

1. **Dá para resolver sem LLM?** Use um hook, script ou linter (veja `04-hooks-e-automacoes.md`).
2. **A resposta tem menos de 10 linhas?** Use o modelo leve.
3. **Envolve vários arquivos ou decisões de design?** Use o modelo intermediário.
4. **É arquitetura nova, com trade-offs e riscos?** Só aqui vale o modelo de topo.

## Como trocar de modelo no Kiro

1. No painel de chat, abra o **seletor de modelo** ao lado da caixa de mensagem.
2. Escolha o modelo para a sessão atual. A escolha vale para as próximas mensagens da conversa.
3. Se a sua conta oferecer o modo automático, use-o como padrão e troque manualmente só quando precisar.
4. Para tarefas recorrentes (como commit), prefira **hooks** ou **skills**, que já fixam o modelo certo.

## Sinais de que você está usando o modelo errado

- A resposta veio perfeita, mas a pergunta era trivial: você pagou caro demais.
- Você reformulou o prompt 3 vezes e o modelo leve não acertou: suba um nível.
- A conversa ficou gigante: resete o contexto antes de trocar de modelo (veja `08-anti-padroes.md`).

## Métricas que o RADAR acompanha

- **Model fit rate:** % das chamadas com modelo adequado à tarefa (meta: ≥ 85%).
- **Custo desperdiçado:** custo real menos o custo que teria com o modelo recomendado.
- **Custo por PR mergeado.**

Dúvidas? Fale com o Comitê de IA no canal `#kiro-champions`.
