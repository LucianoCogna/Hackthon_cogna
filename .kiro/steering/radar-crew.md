---
name: radar-crew
description: Contexto e regras do RADAR Crew — kit reutilizável de agentes, skills e hooks do Kiro para squads da VP Tech. Sempre incluído quando o kit está instalado.
inclusion: always
---

# RADAR Crew — contexto e regras

O RADAR mede se a adoção de IA (Kiro + AI-DLC) melhora a engenharia da VP Tech em
velocidade, qualidade e custo. O **RADAR Crew** é o que *age* sobre o que o RADAR mede:
um conjunto de agentes, skills e um hook do Kiro que qualquer squad instala no próprio
repositório copiando a pasta `.kiro/`.

## Build Once, Use Everywhere

Nada aqui é específico de uma squad. Os agentes detectam o contexto do repositório
(prefixo de Jira, stack, convenções) em vez de assumir nomes fixos. Uma squad instala,
seleciona os agentes no seletor do Kiro e usa.

## Regras do crew (valem para todos os agentes)

- **Responder em pt-BR**, com evidência concreta: `arquivo:linha`, número, link do PR/card.
- **Nunca inventar evidência.** Se o dado não está no diff, no card ou no repo, diga que
  não encontrou — não preencha com suposição.
- **Métricas apoiam conversa, não ranking punitivo.** Nada de "pior dev". O objetivo é
  apoiar o Tech Lead e o dev, não expor ninguém.
- **LGPD / segurança:** não colar secrets nem PII (dados de aluno, CPF, e-mail) em prompts
  ou arquivos versionados. Referenciar por nome da chave, nunca o valor.
- **PR enxuto:** preferir PRs menores, uma tarefa da spec por PR. É recomendação, não regra:
  o hook `pr-size-hint` apenas avisa quando o diff passa de 1000 linhas, nunca bloqueia.
- **Custo consciente:** antes de uma tarefa, pensar se ela precisa mesmo de LLM. Commit,
  lint e formatação são determinísticos (hook, custo zero). Ver a skill `sugere-modelo`.

## Peças do kit

| Peça | Caminho | Papel |
|---|---|---|
| Agente `kirocopter` | `.kiro/agents/kirocopter.md` | Entrada do crew: roteia o pedido |
| Agente `analise-starter` | `.kiro/agents/analise-starter.md` | Abre a análise de um card de Jira (qualquer prefixo) |
| Agente `jira-adherence` | `.kiro/agents/jira-adherence.md` | Audita PR × critérios do card |
| Agente `pr-auditor` | `.kiro/agents/pr-auditor.md` | Calcula o risk score do PR |
| Skill `kirocop-sugere-modelo` | `.kiro/skills/kirocop-sugere-modelo/SKILL.md` | Dica de modelo por tarefa, antes de executar |
| Skill `kirocop-spec-ears` | `.kiro/skills/kirocop-spec-ears/SKILL.md` | Template de critérios de aceite |
| Skill `kirocop-revisao-pr` | `.kiro/skills/kirocop-revisao-pr/SKILL.md` | Checklist de revisão de PR com IA |
| Skill `kirocop-git-conventions` | `.kiro/skills/kirocop-git-conventions/SKILL.md` | Branch/commit/PR (universal, sem git flow) |
| Hook `pr-size-hint` | `.kiro/hooks/pr-size-guard.json` | Avisa (não bloqueia) em PR > 1000 linhas, sem LLM |
| Template de PR | `.github/pull_request_template.md` | Corpo do PR com card + % de IA + checklist |
| Spec de exemplo | `.kiro/specs/exemplo-checkout-demo001/` | requirements → design → tasks (card fictício DEMO-001) |
| Onboarding | `.kiro/steering/kirocop-onboarding.md` | Guia de qual agente chamar |
