---
name: kirocop-revisao-pr
description: Checklist de revisão de PR com código gerado por IA (KiroCópter). Use ao revisar um PR ou ao calcular o risk score de um PR.
---

# Checklist de revisão de PR (código com IA)

Use ao revisar um PR, especialmente quando parte do código foi gerada por IA. É a base do
risk score do agente `pr-auditor`.

- [ ] O PR **declara a % de IA** e tem **história do Jira vinculada**.
- [ ] O **tempo de revisão** é compatível com o tamanho (~30 min por 1.000 linhas de diff,
      mínimo 10 min). Aprovação em segundos num PR grande é sinal de alerta.
- [ ] **Todos os critérios de aceite** do card têm evidência no diff.
- [ ] **Testes novos** cobrem os critérios entregues.
- [ ] Sem **secrets, PII** (CPF, e-mail, dado de aluno) nem **dependência nova** sem justificativa.
- [ ] O PR tem **tamanho gerenciável**. PR muito grande (acima de ~1000 linhas) é sinal
      para considerar quebrar por tarefa da spec — recomendação, não bloqueio.
- [ ] CI **passou** (build + testes).

## Faixas de risco (risk score 0–100)

- **0–39 Saudável** — segue o fluxo normal.
- **40–69 Atenção** — revisar os pontos marcados antes do merge.
- **70+ Crítico** — pedir re-review com os motivos anexados.
