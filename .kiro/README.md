```
          +#+++++ -#-#
          +#--##++++++ +#######
                    --#  ++-   --+
               #++#+++#   #+--+##
             -+++#+#######+
            +++++-+#   - ## #           K I R O C O P T E R
           ++++++-##+++++##+ #          Build Once, Use Everywhere
          #++++#+-++###++++#####
          ##--+###+          ###        crew de agentes do Kiro
           #       -##   ##     -        para a engenharia da VP Tech
          #  -     ###  ###     #
         -  --     #    ##      #        o esquadrao que sobrevoa a
      #                        #         engenharia e aponta onde pousar.
       -###+-                 -
         #                   #
         #                  #
          #------++--     ##
                  ##-- +#-
```

# KiroCópter — crew de engenharia da VP Tech

Kit reutilizável de **agentes + skills + hook** do Kiro. O RADAR *mede* se a IA está
melhorando a engenharia; o **KiroCópter** é o esquadrão que *age* sobre isso: abre a análise
de um card, audita se o PR bate com o card, calcula o risco do PR e sugere o modelo certo
por tarefa.

Feito pelo esquadrão **Kirocópteros**. Sobrevoa a engenharia e aponta onde pousar atenção.

## Instalação (Build Once, Use Everywhere)

1. Copie a pasta `.kiro/` deste kit para a **raiz do seu repositório** (merge com o `.kiro/`
   que já existir).
2. Abra o Kiro no repositório. Os 4 agentes aparecem no **seletor de agentes**.
3. O hook `pr-size-guard` precisa de **Node.js no PATH** (`node --version` deve responder).
   É a única dependência externa, e vale **só para o hook** — os 4 agentes e as 3 skills
   funcionam sem Node. Se a squad não usar Node, remova `.kiro/hooks/` e o resto do kit
   segue funcionando.

Nada aqui é específico de uma squad: os agentes detectam o prefixo do Jira e as convenções
do repo. Instale e use.

## O que vem no kit

| Peça | Caminho | Categoria | O que faz |
|---|---|---|---|
| `kirocopter` | `.kiro/agents/` | ORQUESTRA | Torre de controle: recebe o pedido e aciona o agente certo |
| `analise-starter` | `.kiro/agents/` | SPEC/BUILD | Abre a análise de um card do Jira (qualquer prefixo): cria pasta + README no padrão da squad, puxa o contexto do card e sugere o modelo antes de cada tarefa |
| `jira-adherence` | `.kiro/agents/` | SPEC | Audita o diff do PR contra os critérios de aceite do card, critério a critério, com evidência |
| `pr-auditor` | `.kiro/agents/` | RUN | Calcula o risk score do PR e, se crítico, redige o pedido de re-review |
| `kirocop-sugere-modelo` | `.kiro/skills/` | — | Política de modelo por tarefa; aponta quando a tarefa nem precisa de LLM |
| `kirocop-spec-ears` | `.kiro/skills/` | — | Template de critérios de aceite (EARS / Dado-Quando-Então) |
| `kirocop-revisao-pr` | `.kiro/skills/` | — | Checklist de revisão de PR com código gerado por IA |
| `kirocop-git-conventions` | `.kiro/skills/` | — | Nomenclatura de branch, commit e PR (universal; não impõe git flow) |
| `pr-size-hint` | `.kiro/hooks/` | RUN | **Avisa** (não bloqueia) quando o PR passa de 1000 linhas, sugerindo quebrar. Determinístico, **sem LLM** |
| Spec de exemplo | `.kiro/specs/exemplo-checkout-demo001/` | SPEC | requirements → design → tasks do card fictício DEMO-001 |
| Template de PR | `.github/pull_request_template.md` | RUN | Corpo de PR com card + % de IA + checklist (sem LLM) |
| Onboarding | `.kiro/steering/kirocop-onboarding.md` | — | Guia: qual agente chamar em cada situação |

Cobertura do desafio: **SPEC** (analise-starter, jira-adherence, spec de exemplo),
**BUILD** (analise-starter, sugere-modelo), **RUN** (pr-auditor, pr-size-hint, template de PR).

## Jira: dois caminhos (nunca trava)

O `analise-starter` e o `jira-adherence` funcionam de dois jeitos:

1. **Com MCP do Jira** — puxam título, descrição, tipo e critérios de aceite direto do card.
2. **Sem MCP** — você cola o conteúdo do card (ou já existe um README local da análise).

### Prefixo genérico

O Jira da VP Tech tem vários prefixos. Os agentes detectam o padrão `[A-Z]+-\d+`
(`CRPR-123`, `DENA-1046`, `PLAT-7`, `DATA-55`, ...) e classificam o **tipo** do card
(incidente, story, spike) para escolher o template de pasta. Tipo desconhecido cai num
default e o agente pergunta a convenção da squad.

## Demo ao vivo (pasta `exemplo-demo/`)

Prova de que o crew funciona, sem depender de MCP:

Os arquivos de `exemplo-demo/` são **fictícios** (prefixo `DEMO-`), só para demonstração —
não expõem nada real da VP Tech.

1. Selecione o agente **`pr-auditor`** no Kiro.
2. Peça: *"calcule o risco do PR em `exemplo-demo/DEMO-PR-1.diff`"*.
   Esperado: score **crítico (70+)** — 99% IA, revisão ~180× mais rápida que o esperado,
   sem testes, PR grande — e um pedido de re-review pronto.
3. Selecione **`jira-adherence`**. Peça: *"audite o `DEMO-PR-1.diff` contra o
   `DEMO-001-card.md`"*.
   Esperado: critério 1 (validação de CPF) **não encontrado** no diff, critério 4 (testes)
   **não encontrado**; aderência ~50%.
4. Selecione **`analise-starter`**. Peça: *"abra a análise do card DEMO-001"* (cole o card ou
   deixe ele puxar do Jira). Esperado: ele anuncia o modelo sugerido antes de cada passo e
   cria a pasta + README no padrão.

## Schema

Os agentes são arquivos Markdown (`.kiro/agents/<nome>.md`) no schema atual do Kiro
(IDE 1.x / CLI V3): frontmatter com `tools` (`read`, `write`, `shell`, `invoke_sub_agent`),
`resources` (`file://`) e `permissions.rules` (capability + effect + match) para o controle
de acesso. O corpo do arquivo é o prompt. O formato antigo (JSON com `allowedTools` /
`toolsSettings`) é ignorado pelo Kiro novo até ser convertido com `/upgrade-agent`.
Squads ainda em Kiro 0.x / CLI 2.x precisam do formato antigo (ver o histórico do git).
Ref.: https://kiro.dev/docs/custom-agents/configuration-reference/
