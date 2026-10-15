# 02 · Spec-driven development com o Kiro

O Kiro organiza o trabalho em **specs**: um fluxo em três etapas que transforma uma ideia em
requisitos testáveis, um design técnico e uma lista de tarefas executáveis.

```
.kiro/specs/<nome-da-feature>/
├── requirements.md   # O QUÊ: histórias e critérios de aceite
├── design.md         # COMO: arquitetura, componentes, dados, riscos
└── tasks.md          # PASSOS: tarefas pequenas e rastreáveis
```

## O fluxo

1. **Requirements:** descreva o objetivo. O Kiro gera histórias de usuário com critérios de aceite.
   *Revise e ajuste antes de seguir.* É aqui que se evita a ida e vinda de requisito.
2. **Design:** o Kiro propõe arquitetura, interfaces, modelo de dados e estratégia de testes,
   com base no código existente e nos steering files.
3. **Tasks:** o design vira uma lista de tarefas ligadas aos requisitos. Execute uma de cada vez
   e revise o diff de cada uma.

## Quando usar spec e quando usar chat

| Use **spec** quando… | Use **chat/vibe** quando… |
|---|---|
| A feature tem mais de 1 dia de trabalho | É uma dúvida pontual ou exploração |
| Há critérios de aceite no Jira | Você está prototipando algo descartável |
| Vários arquivos ou serviços mudam | A mudança cabe em 1 arquivo |
| Outras pessoas vão revisar ou manter | É um script pessoal |

## Template de critérios de aceite (EARS)

O Kiro usa a notação **EARS** (*Easy Approach to Requirements Syntax*):

```
QUANDO <evento/gatilho>, O SISTEMA DEVE <resposta esperada>.
SE <condição indesejada>, ENTÃO O SISTEMA DEVE <tratamento>.
ENQUANTO <estado>, O SISTEMA DEVE <comportamento>.
```

Exemplo, para a história VEN-412 (checkout com cupom):

```
QUANDO o comprador aplicar um cupom válido, O SISTEMA DEVE recalcular o total do pedido.
QUANDO o comprador confirmar o pedido, O SISTEMA DEVE validar o CPF antes de gerar o pedido.
SE o cupom estiver expirado, ENTÃO O SISTEMA DEVE exibir uma mensagem amigável e manter o total original.
QUANDO o pedido for gerado, O SISTEMA DEVE registrar o evento de conversão no analytics.
```

## Alternativa: Dado-Quando-Então (Gherkin)

```gherkin
Cenário: cupom expirado
  Dado um carrinho com total de R$ 500
  E o cupom "BOASVINDAS" expirado
  Quando o comprador aplicar o cupom
  Então o sistema exibe "Este cupom expirou"
  E o total continua R$ 500
```

## Checklist de uma boa spec

- [ ] Cada critério é **testável**: dá para escrever um teste que passa ou falha.
- [ ] Casos de borda e erros estão descritos.
- [ ] Dependências externas (infra, outros squads) estão explícitas.
- [ ] A chave do Jira está no título da spec e nos PRs.
- [ ] O design cita os riscos e como mitigá-los.

> No RADAR, specs com qualidade abaixo de 60 têm **2× mais histórias reabertas**.
