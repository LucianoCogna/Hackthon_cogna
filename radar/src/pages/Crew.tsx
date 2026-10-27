import { useMemo, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  Bot,
  CircleDollarSign,
  Compass,
  Copy,
  Eye,
  FolderGit2,
  GitPullRequest,
  Hammer,
  Loader2,
  Rocket,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench,
} from "lucide-react";
import { FadeIn, PageHeader, MetricInfo } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import {
  RECOMMENDED,
  ROUTING,
  MODEL_MULT,
  TASK_BASE,
  CREDIT_BRL,
} from "@/mocks/kiro";
import type { KiroTask } from "@/mocks/types";
import { useScope } from "@/app/store";
import { prRisk } from "@/lib/metrics";
import { fmtBRL, fmtInt } from "@/lib/format";

// ---------------------------------------------------------------------------
// KiroCópter — crew de agentes do Kiro (kit reutilizável da VP Tech)
// Categorias do desafio "Build Once, Use Everywhere"
// ---------------------------------------------------------------------------
type Category = "spec" | "build" | "run" | "orchestrate";

const CATEGORY: Record<Category, { label: string; tone: Tone; desc: string }> =
  {
    spec: {
      label: "SPEC",
      tone: "ai",
      desc: "Descobrir, analisar e especificar melhor",
    },
    build: {
      label: "BUILD",
      tone: "ok",
      desc: "Desenvolver e entregar mais rápido",
    },
    run: {
      label: "RUN",
      tone: "warn",
      desc: "Operar e sustentar com eficiência",
    },
    orchestrate: {
      label: "ORQUESTRA",
      tone: "accent",
      desc: "Recebe o pedido e aciona o agente certo",
    },
  };

type Agent = {
  id: string;
  role: string;
  category: Category;
  icon: React.ElementType;
  does: string;
  reusable: string;
  solves: string;
  /** conteúdo real do arquivo .kiro/agents/<id>.md (frontmatter + prompt) */
  md: string;
};

// ---------------------------------------------------------------------------
// Conteúdo real dos agentes (.kiro/agents/<id>.md) — espelha o kit KiroCópter
// ---------------------------------------------------------------------------
const AGENTS: Agent[] = [
  {
    id: "radar-orchestrator",
    role: "Torre de controle do crew",
    category: "orchestrate",
    icon: Compass,
    does: "Recebe o pedido do Tech Lead ou do dev e roteia para o especialista: abrir card, auditar PR × card ou calcular risco. Consolida a resposta.",
    reusable:
      "A squad fala com um agente só; a divisão de trabalho fica dentro do crew.",
    solves:
      'Transforma um pedido solto ("não sei por onde começar") em próximos passos.',
    md: `---
name: radar-orchestrator
description: "KiroCópter · Orquestrador: recebe o pedido do Tech Lead/dev e aciona o agente certo — analise-starter (abrir card), jira-adherence (PR x card) ou pr-auditor (risco do PR) — e consolida a resposta."
tools: ["read", "invoke_sub_agent", "orchestrate_subagent"]
resources:
  - "file://.kiro/steering/radar-crew.md"
permissions:
  rules:
    - capability: fs_read
      effect: allow
      match:
        - "**"
    - capability: subagent
      effect: allow
      match:
        - "analise-starter"
        - "jira-adherence"
        - "pr-auditor"
        - "default"
---

Você é o radar-orchestrator do KiroCópter, a torre de controle do crew. Recebe um pedido e roteia para o especialista:

- Abrir/organizar a análise de um card do Jira (qualquer prefixo [A-Z]+-\\d+), criar pasta/README → delegue ao analise-starter.
- Auditar se um PR bate com os critérios do card → delegue ao jira-adherence.
- Calcular o risco de um PR (99% IA, aprovado em 30s, etc.) → delegue ao pr-auditor.
- Dúvida de qual modelo usar numa tarefa → responda com base na skill kirocop-sugere-modelo (não precisa delegar).

Se o pedido combinar mais de um (ex.: 'abre o card X e já audita o PR Y'), acione os agentes na ordem e consolide. Responda SEMPRE em pt-BR com: (1) diagnóstico curto, (2) evidências do agente acionado, (3) até 3 próximas ações. Se o pedido for ambíguo, pergunte antes de delegar.
`,
  },
  {
    id: "analise-starter",
    role: "Abre a análise de um card do Jira",
    category: "spec",
    icon: FolderGit2,
    does: "Classifica o tipo do card (qualquer prefixo [A-Z]+-\\d+), cria pasta + README no padrão da squad, puxa o contexto do Jira (MCP) ou colado, e sugere o modelo antes de cada tarefa.",
    reusable:
      "Detecta o prefixo do Jira e a convenção do repo — não assume CRPR nem DENA.",
    solves:
      '"Peguei o card X, quero começar": deixa o terreno pronto para o trabalho.',
    md: `---
name: analise-starter
description: "KiroCópter · SPEC/BUILD: abre a análise de um card do Jira (qualquer prefixo, ex. CRPR-, DENA-, PLAT-...). Classifica o tipo do card, cria a estrutura de pasta e o README no padrão da squad, puxando o contexto do Jira (MCP) ou do conteúdo colado. Antes de cada tarefa, sugere o modelo adequado."
tools: ["read", "write", "shell"]
resources:
  - "file://.kiro/steering/radar-crew.md"
  - "file://.kiro/skills/kirocop-sugere-modelo/SKILL.md"
  - "file://.kiro/skills/kirocop-spec-ears/SKILL.md"
  - "file://.kiro/skills/kirocop-git-conventions/SKILL.md"
permissions:
  rules:
    - capability: fs_read
      effect: allow
      match:
        - "**"
    - capability: filesystem
      effect: allow
      match:
        - ".kiro/analises/**"
    - capability: shell
      effect: allow
      match:
        - "git status*"
        - "git log*"
    - capability: shell
      effect: deny
      match:
        - "git push*"
        - "rm *"
        - "del *"
---

Você é o analise-starter do KiroCópter. Abre a análise de um card do Jira seguindo o padrão da squad e deixa tudo pronto para o trabalho começar.

REGRA DE OURO — antes de CADA tarefa, consulte a skill kirocop-sugere-modelo e anuncie em uma linha: 'Tarefa: <tipo> → modelo sugerido: <modelo>' (ou 'sem LLM' quando for determinístico). Só então execute. Isso dá governança de custo sem tirar a escolha do dev.

PREFIXO GENÉRICO: o Jira da VP Tech tem vários prefixos. Detecte o padrão [A-Z]+-\\d+ (CRPR-123, DENA-1046, PLAT-7, DATA-55, etc.). NUNCA assuma que é só CRPR ou DENA.

CLASSIFIQUE O TIPO do card e escolha o template de pasta (incidente, story/feature, spike ou default). Puxe o contexto pelo MCP do Jira OU pelo conteúdo colado — nunca trave. O README deve ter contexto, descrição, critérios de aceite (EARS/Dado-Quando-Então via kirocop-spec-ears), checklist, decisões, status com emoji e 'Ferramental utilizado'. Ao final, sugira branch e primeiro commit no padrão kirocop-git-conventions, sem impor git flow. Só escreva dentro de .kiro/analises/. Responda em pt-BR.
`,
  },
  {
    id: "jira-adherence",
    role: "Audita PR × critérios do card",
    category: "spec",
    icon: ScrollText,
    does: "Lê os critérios de aceite do card e o diff do PR. Marca cada critério como atendido, parcial ou não encontrado, com evidência arquivo:linha.",
    reusable:
      "Toda squad tem Jira e PR. A mesma auditoria vale para qualquer uma.",
    solves:
      '"O PR bate com o card?": aponta o critério que ficou fora do diff.',
    md: `---
name: jira-adherence
description: "KiroCópter · SPEC: audita o diff de um PR contra os critérios de aceite da história do Jira, marcando cada critério como atendido, parcial ou não encontrado, com evidência arquivo:linha."
tools: ["read", "shell"]
resources:
  - "file://.kiro/steering/radar-crew.md"
  - "file://.kiro/skills/kirocop-spec-ears/SKILL.md"
permissions:
  rules:
    - capability: fs_read
      effect: allow
      match:
        - "**"
    - capability: shell
      effect: allow
      match:
        - "git diff*"
        - "git log*"
        - "git show*"
        - "git status*"
    - capability: shell
      effect: deny
      match:
        - "git push*"
        - "git commit*"
        - "rm *"
        - "del *"
---

Você é o jira-adherence do KiroCópter. Audita se o PR entrega o que o card do Jira pediu.

Entradas (dois caminhos, nunca trave): os critérios de aceite vêm do MCP do Jira (qualquer prefixo [A-Z]+-\\d+), do conteúdo colado ou do README local em .kiro/analises/; o diff vem de git diff (somente leitura) ou colado.

Para cada critério de aceite, responda em uma linha: [atendido | parcial | não encontrado] — <critério> — evidência: <arquivo:linha ou trecho do diff>. Use a skill kirocop-spec-ears como referência do que é um critério verificável. Ao final: aderência = atendidos / total (parcial conta 0,5), em %. Liste os não atendidos como ação para o PR. Nunca invente evidência. Responda em pt-BR.
`,
  },
  {
    id: "pr-auditor",
    role: "Calcula o risk score do PR",
    category: "run",
    icon: GitPullRequest,
    does: "Calcula o risk score do PR (revisão vs. esperado, % IA, aderência, testes, tamanho) e, se crítico, redige o pedido de re-review pronto para colar.",
    reusable: "Mede PR real (git) ou números colados; roda em qualquer repo.",
    solves: '"99% IA, aprovado em 30s": vira um score com os motivos claros.',
    md: `---
name: pr-auditor
description: "KiroCópter · RUN: calcula o risk score de um PR (revisão vs. esperado, % IA, aderência ao card, testes, tamanho) e, se crítico, redige o pedido de re-review."
tools: ["read", "shell"]
resources:
  - "file://.kiro/steering/radar-crew.md"
  - "file://.kiro/skills/kirocop-revisao-pr/SKILL.md"
permissions:
  rules:
    - capability: fs_read
      effect: allow
      match:
        - "**"
    - capability: shell
      effect: allow
      match:
        - "git diff*"
        - "git log*"
        - "git show*"
        - "git status*"
    - capability: shell
      effect: deny
      match:
        - "git push*"
        - "git commit*"
        - "rm *"
        - "del *"
---

Você é o pr-auditor do KiroCópter. Calcule o PR Risk Score (0-100):

  risk = 35*clamp(1 - reviewRatio, 0, 1)
       + 25*(%IA / 100)
       + 25*(1 - (aderencia ?? 50)/100)
       + 10*(testesAdicionados ? 0 : 1)
       +  5*((linhasAdd + linhasRem) > 1000 ? 1 : 0)
       - 15*(revisaoAssistidaPorIA ? 1 : 0)

  reviewRatio = tempoRevisaoMin / max(10, (linhasAdd + linhasRem)/1000 * 30)

Faixas: 0-39 saudável, 40-69 atenção, 70+ crítico.

Colete dados por dois caminhos (nunca trave): git diff/log somente leitura para linhas e arquivos, pedindo ao usuário o que o git não dá (% IA, tempo de revisão, aderência, revisão assistida, testes); ou calcule a partir dos números colados. Responda em pt-BR com o score, a faixa, a lista de motivos (cada parcela que pesou) e — se 70+ — um pedido de re-review pronto para colar. Nunca invente números: peça ou assuma o default e diga qual assumiu.
`,
  },
];

// skills de apoio (não são agentes)
const SKILLS_INFO: { id: string; desc: string }[] = [
  {
    id: "kirocop-sugere-modelo",
    desc: "Política de modelo por tarefa; aponta quando a tarefa nem precisa de LLM",
  },
  {
    id: "kirocop-spec-ears",
    desc: "Template de critérios de aceite (EARS / Dado-Quando-Então)",
  },
  {
    id: "kirocop-revisao-pr",
    desc: "Checklist de revisão de PR com código gerado por IA",
  },
  {
    id: "kirocop-git-conventions",
    desc: "Nomenclatura de branch, commit e PR (universal, sem git flow)",
  },
];

// ---------------------------------------------------------------------------
// Fluxo: situação -> agente -> resultado
// ---------------------------------------------------------------------------
const FLOW = [
  {
    trigger: "Peguei o card X, quero começar",
    agent: "analise-starter",
    action: "Cria pasta + README no padrão e sugere o modelo por tarefa",
  },
  {
    trigger: "Esse PR bate com o card?",
    agent: "jira-adherence",
    action: "Audita critério a critério, com evidência arquivo:linha",
  },
  {
    trigger: "Esse PR é arriscado? (99% IA, 30s)",
    agent: "pr-auditor",
    action: "Calcula o risk score e, se crítico, redige o re-review",
  },
];

// ---------------------------------------------------------------------------
// Arquivos do kit (.zip) — conteúdo real do KiroCópter
// ---------------------------------------------------------------------------
// tabela de modelo por tarefa (4 colunas), a partir do mock que a aba Custo também usa
const routingTable = (Object.keys(RECOMMENDED) as KiroTask[])
  .map((t) => {
    const alt = ROUTING[t].filter((m) => m !== RECOMMENDED[t]);
    return `| ${t} | ${RECOMMENDED[t]} | ${alt.length ? alt.join(", ") : "—"} | |`;
  })
  .join("\n");

const STEERING_RADAR_CREW = `---
name: radar-crew
description: Contexto e regras do RADAR Crew / KiroCópter — kit reutilizável de agentes, skills e hook do Kiro para squads da VP Tech. Sempre incluído quando o kit está instalado.
inclusion: always
---

# RADAR Crew (KiroCópter) — contexto e regras

O RADAR mede se a adoção de IA (Kiro + AI-DLC) melhora a engenharia da VP Tech em
velocidade, qualidade e custo. O KiroCópter é o que *age* sobre o que o RADAR mede:
agentes, skills e um hook do Kiro que qualquer squad instala copiando a pasta \`.kiro/\`.

## Build Once, Use Everywhere
Nada aqui é específico de uma squad. Os agentes detectam o contexto do repositório
(prefixo de Jira, stack, convenções) em vez de assumir nomes fixos.

## Regras do crew (valem para todos os agentes)
- Responder em pt-BR, com evidência concreta: arquivo:linha, número, link do PR/card.
- Nunca inventar evidência. Se o dado não está no diff/card/repo, diga que não encontrou.
- Métricas apoiam conversa, não ranking punitivo. Nada de "pior dev".
- LGPD/segurança: não colar secrets nem PII (dado de aluno, CPF, e-mail). Referenciar por nome da chave.
- PR enxuto: uma tarefa da spec por PR. É recomendação; o hook pr-size-hint só avisa acima de 1000 linhas.
- Custo consciente: antes da tarefa, pensar se precisa mesmo de LLM. Commit/lint/formatação são determinísticos (hook, custo zero).
`;

const KIT_FILES: Record<string, string> = {
  "steering/radar-crew.md": STEERING_RADAR_CREW,
  "steering/kirocop-onboarding.md": `---
name: kirocop-onboarding
description: Guia rápido de como usar o KiroCópter no dia a dia — qual agente chamar em cada situação. Carregue ao começar a usar o kit ou quando tiver dúvida de qual peça aplicar.
inclusion: manual
---

# KiroCópter — como usar no dia a dia

| Situação | Agente | O que ele faz |
|---|---|---|
| "Peguei o card X, quero começar" | analise-starter | cria pasta + README, puxa o card, sugere o modelo por tarefa |
| "Esse PR bate com o card?" | jira-adherence | audita critério a critério, com evidência |
| "Esse PR é arriscado?" | pr-auditor | calcula o risk score e, se crítico, escreve o re-review |
| "Não sei por onde começar" | radar-orchestrator | recebe o pedido e aciona o especialista certo |

Na dúvida, fale com o radar-orchestrator — ele direciona. Jira funciona com MCP ou card
colado, e qualquer prefixo [A-Z]+-\\d+ (CRPR-, DENA-, PLAT-, DATA-...). Experimente sem
risco com a pasta exemplo-demo/ (card e PR fictícios DEMO-).
`,
  "skills/kirocop-sugere-modelo/SKILL.md": `---
name: kirocop-sugere-modelo
description: Política de escolha de modelo por tarefa da VP Tech (KiroCópter). Use ANTES de executar uma tarefa para sugerir qual modelo usar e quando a tarefa nem precisa de LLM. Agnóstico de stack.
---

# Sugere-modelo — política de modelo por tarefa

O Kiro no modo Auto já roteia o modelo por turno. Esta skill não substitui o Auto: dá
transparência e governança — qual modelo é adequado e, mais importante, quando a tarefa
nem precisa de LLM.

| Tarefa | Modelo sugerido | Também aceitável | Observação |
|---|---|---|---|
${routingTable}
| formatar / lint / contar linhas | **sem LLM** | — | hook ou script |

## Regras
- Nunca usar Opus ou Fable para commit, formatação ou pergunta simples.
- Fable só para arquitetura ou spec complexa.
- Commit, lint e formatação podem ser hook determinístico: custo R$ 0.
- Custo desperdiçado = custo real − custo com o modelo sugerido (número da aba Custo & Governança).
`,
  "skills/kirocop-spec-ears/SKILL.md": `---
name: kirocop-spec-ears
description: Template de critérios de aceite EARS e Dado-Quando-Então (KiroCópter). Use ao escrever ou auditar os critérios de aceite de uma história/card do Jira.
---

# Critérios de aceite — EARS e Dado-Quando-Então

- EARS: QUANDO <evento/condição>, O SISTEMA DEVE <resposta observável>.
- Dado-Quando-Então: DADO <contexto>, QUANDO <ação>, ENTÃO <resultado observável>.

## Regras
- Um comportamento por critério. Cada critério verificável no diff ou em um teste.
- Evitar critério vago. Trocar por mensurável.
- Agnóstico de stack: o que é "verificável" muda com a squad (teste, código, API, tela, dados).
`,
  "skills/kirocop-revisao-pr/SKILL.md": `---
name: kirocop-revisao-pr
description: Checklist de revisão de PR com código gerado por IA (KiroCópter). Use ao revisar um PR ou ao calcular o risk score de um PR.
---

# Checklist de revisão de PR (código com IA)

- [ ] O PR declara a % de IA e tem história do Jira vinculada.
- [ ] O tempo de revisão é compatível com o tamanho (~30 min por 1.000 linhas, mínimo 10 min).
- [ ] Todos os critérios de aceite do card têm evidência no diff.
- [ ] Testes novos cobrem os critérios entregues.
- [ ] Sem secrets, PII (CPF, e-mail, dado de aluno) nem dependência nova sem justificativa.
- [ ] PR em tamanho gerenciável (acima de ~1000 linhas, considerar quebrar — recomendação).
- [ ] CI passou (build + testes).

## Faixas de risco (risk score 0–100)
- 0–39 Saudável · 40–69 Atenção · 70+ Crítico (pedir re-review com motivos anexados).
`,
  "skills/kirocop-git-conventions/SKILL.md": `---
name: kirocop-git-conventions
description: Convenções universais de branch, commit e PR da VP Tech (KiroCópter). Use ao criar branch, escrever commit ou abrir PR. Cobre só nomenclatura — NÃO impõe git flow.
---

# Convenções de Git — KiroCópter

Padroniza a forma de nomear e comentar, não o fluxo de branches (cada squad usa o seu).

## Branch
\`<tipo>/<CARD>-<slug-curto>\` — tipo em feat|fix|chore|refactor|docs|test, CARD de qualquer
prefixo. Ex.: \`feat/CRPR-123-validacao-cpf\`, \`fix/DENA-1046-lock-carga\`.

## Commit (Conventional Commits)
\`<tipo>(<escopo>): <descrição no imperativo>\`. Ex.: \`feat(checkout): valida dígito do CPF\`.
Referencie o card no corpo: \`Refs CRPR-123\`.

## PR
Um card por PR. Preencher o template do kit (o que faz, card, % de IA, checklist, evidência).
Antes do review, rodar o pr-auditor e o jira-adherence.
`,
  "hooks/pr-size-guard.json": JSON.stringify(
    {
      version: "v1",
      hooks: [
        {
          name: "KiroCópter · pr-size-hint",
          description:
            "Avisa (não bloqueia) quando o diff contra a main passa de 1000 linhas, sugerindo quebrar o PR. Determinístico, sem LLM (custo zero).",
          trigger: "PreToolUse",
          matcher: "shell|execute",
          action: {
            type: "command",
            command: "node .kiro/hooks/scripts/pr-size-guard.mjs",
          },
          timeout: 30,
        },
      ],
    },
    null,
    2,
  ),
  "hooks/scripts/pr-size-guard.mjs": `// KiroCópter · pr-size-hint
// Recebe o contexto do hook em stdin (JSON). SEMPRE deixa o push seguir (exit 0).
// Quando o diff passa de 1000 linhas, imprime um AVISO — não bloqueia.
// Determinístico: não usa LLM. Custo R$ 0.
import { execSync } from 'node:child_process';

const HINT_AT = 1000; // acima disso, avisa (não bloqueia)

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  if (!/git\\s+push/.test(input)) process.exit(0);

  let base = 'origin/main';
  try {
    execSync('git rev-parse --verify origin/main', { stdio: 'ignore' });
  } catch {
    try {
      execSync('git rev-parse --verify origin/master', { stdio: 'ignore' });
      base = 'origin/master';
    } catch {
      process.exit(0);
    }
  }

  let lines = 0;
  try {
    const stat = execSync(\`git diff --shortstat \${base}...HEAD\`, { encoding: 'utf8' });
    const add = Number(/(\\d+) insertion/.exec(stat)?.[1] ?? 0);
    const del = Number(/(\\d+) deletion/.exec(stat)?.[1] ?? 0);
    lines = add + del;
  } catch {
    process.exit(0);
  }

  if (lines > HINT_AT) {
    console.log(
      \`KiroCópter pr-size-hint: este PR tem ~\${lines} linhas de diff contra \${base} \` +
      \`(acima de \${HINT_AT}). Vale considerar quebrar por tarefa da spec. É só um aviso.\`,
    );
  }
  process.exit(0);
});
`,
  "specs/exemplo-checkout-demo001/requirements.md": `# Requirements — DEMO-001 · Checkout: validar CPF e aplicar cupom

> Spec de EXEMPLO do KiroCópter (card fictício DEMO-001). Mostra o fluxo spec-driven
> requirements → design → tasks. Não é uma feature real da VP Tech.

## Requisitos (EARS / Dado-Quando-Então)
- R1 — QUANDO o comprador informar um CPF, O SISTEMA DEVE validar o dígito verificador; se inválido, recusar o checkout com mensagem clara.
- R2 — DADO um cupom válido, QUANDO o pedido for fechado, ENTÃO o desconto DEVE ser aplicado ao total.
- R3 — QUANDO o cupom estiver expirado, O SISTEMA DEVE recusar o cupom e manter o preço cheio.
- R4 — O endpoint de checkout DEVE ter testes cobrindo CPF inválido e cupom expirado.

## DoD
- [ ] R1 a R4 implementados e com evidência (código + teste).
- [ ] PR vinculado ao card, com % de IA declarada (template do kit).
`,
  "specs/exemplo-checkout-demo001/design.md": `# Design — DEMO-001 · Checkout

> Spec de EXEMPLO do KiroCópter (card fictício DEMO-001).

## Abordagem
Isolar duas regras puras e plugá-las no handler do checkout. Funções puras são fáceis de
testar (atende R4) e não acoplam a validação ao framework.

| Componente | Responsabilidade | Requisito |
|---|---|---|
| validateCpf(cpf) | valida dígito verificador | R1 |
| applyCoupon(total, coupon) | aplica desconto; expirado mantém total | R2, R3 |
| checkoutHandler | orquestra validação → cupom → fecha pedido | R1–R3 |
`,
  "specs/exemplo-checkout-demo001/tasks.md": `# Tasks — DEMO-001 · Checkout

> Spec de EXEMPLO do KiroCópter. Cada tarefa cabe num PR enxuto.

- [ ] 1. validateCpf — função pura + testes _(R1, R4 · Sonnet)_
- [ ] 2. applyCoupon — regra de expiração + testes _(R2, R3, R4 · Sonnet)_
- [ ] 3. Integrar no checkoutHandler _(R1, R2, R3 · Sonnet)_
- [ ] 4. Revisão e PR — rodar pr-auditor e jira-adherence antes do review _(Sonnet)_
`,
  "README.md": `# KiroCópter — crew de engenharia da VP Tech

Kit reutilizável de agentes + skills + hook do Kiro. O RADAR mede se a IA melhora a
engenharia; o KiroCópter age sobre isso: abre a análise de um card, audita se o PR bate
com o card, calcula o risco do PR e sugere o modelo por tarefa.

## Instalação (Build Once, Use Everywhere)
1. Copie a pasta \`.kiro/\` para a raiz do seu repositório (merge com o que já existir).
2. Abra o Kiro: os 4 agentes aparecem no seletor de agentes.
3. O hook pr-size-hint precisa de Node.js no PATH (é a única dependência externa, e só
   para o hook — os agentes e skills funcionam sem Node).

| Peça | Caminho | Categoria |
|---|---|---|
${AGENTS.map((a) => `| ${a.id} | .kiro/agents/${a.id}.md | ${CATEGORY[a.category].label} |`).join("\n")}
${SKILLS_INFO.map((s) => `| ${s.id} | .kiro/skills/${s.id}/ | — |`).join("\n")}
| pr-size-hint | .kiro/hooks/pr-size-guard.json | RUN |
| Spec de exemplo | .kiro/specs/exemplo-checkout-demo001/ | SPEC |
| Template de PR | .github/pull_request_template.md | RUN |
| Onboarding | .kiro/steering/kirocop-onboarding.md | — |

Os agentes são arquivos Markdown (.kiro/agents/<nome>.md) no schema atual do Kiro
(IDE 1.x / CLI V3). Ref.: https://kiro.dev/docs/custom-agents/configuration-reference/
`,
};

// agentes (.md) entram no zip a partir do array AGENTS
const buildZipFiles = (): Record<string, string> => {
  const files: Record<string, string> = {};
  for (const a of AGENTS) files[`agents/${a.id}.md`] = a.md;
  for (const [path, content] of Object.entries(KIT_FILES))
    files[path] = content;
  return files;
};

const KIT_TREE = `.kiro/
├─ agents/
${AGENTS.map((a) => `│  ├─ ${a.id}.md`).join("\n")}
├─ steering/
│  ├─ radar-crew.md
│  └─ kirocop-onboarding.md
├─ skills/
${SKILLS_INFO.map((s) => `│  ├─ ${s.id}/SKILL.md`).join("\n")}
├─ hooks/
│  ├─ pr-size-guard.json
│  └─ scripts/pr-size-guard.mjs
├─ specs/
│  └─ exemplo-checkout-demo001/  (requirements · design · tasks)
└─ README.md
.github/
└─ pull_request_template.md`;

const TRIVIAL: KiroTask[] = ["commit", "explicar código"];

// classes completas (Tailwind não gera classes montadas por template string)
const ICON_TONE = {
  risk: "border-risk/30 bg-risk/10 text-risk",
  ai: "border-ai/30 bg-ai/10 text-ai",
  warn: "border-warn/30 bg-warn/10 text-warn",
  ok: "border-ok/30 bg-ok/10 text-ok",
} as const;

export default function Crew() {
  const scope = useScope();
  const [viewing, setViewing] = useState<Agent | null>(null);
  const [zipping, setZipping] = useState(false);

  // números do período filtrado: o que o crew teria pegado
  const stats = useMemo(() => {
    const critical = scope.prs.filter((p) => prRisk(p) >= 70).length;
    const lowAdherence = scope.prs.filter(
      (p) => p.jiraAdherence !== null && p.jiraAdherence < 60,
    ).length;
    let wrongCalls = 0;
    let waste = 0;
    for (const u of scope.usage) {
      if (!ROUTING[u.taskType].includes(u.model)) {
        if (TRIVIAL.includes(u.taskType)) wrongCalls += u.calls;
        const ideal =
          TASK_BASE[u.taskType] * MODEL_MULT[RECOMMENDED[u.taskType]] * u.calls;
        waste += Math.max(0, u.credits - ideal) * CREDIT_BRL;
      }
    }
    return { critical, lowAdherence, wrongCalls, waste };
  }, [scope]);

  const copy = (text: string, msg: string, description?: string) => {
    if (!navigator.clipboard)
      return toast.error("Área de transferência indisponível");
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(msg, { description }))
      .catch(() => toast.error("Não foi possível copiar"));
  };

  const downloadKit = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const kiro = zip.folder(".kiro")!;
      for (const [path, content] of Object.entries(buildZipFiles()))
        kiro.file(path, content);
      // template de PR fica em .github/ (fora de .kiro/)
      zip.file(
        ".github/pull_request_template.md",
        `## O que este PR faz\n\n## Card do Jira\nCloses \n\n## % de código gerado por IA\nIA: ___%  ·  revisão assistida por IA? ( ) sim  ( ) não\n\n## Checklist\n- [ ] Todos os critérios de aceite do card estão cobertos no diff\n- [ ] Testes adicionados/atualizados para o que mudou\n- [ ] Sem secrets ou PII no código/commits\n- [ ] PR em tamanho gerenciável (uma tarefa da spec por PR, quando possível)\n- [ ] Rodei o pr-auditor do KiroCópter e tratei os pontos críticos\n\n## Evidência\n`,
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kirocopter-kit.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast.success("kirocopter-kit.zip baixado", {
        description: "Descompacte na raiz do seu repositório",
      });
    } catch {
      toast.error("Não foi possível gerar o .zip");
    } finally {
      setZipping(false);
    }
  };

  const kpis = [
    {
      icon: GitPullRequest,
      tone: "risk",
      value: fmtInt(stats.critical),
      label: "PRs críticos para o pr-auditor",
      info: "PRs do período com risk score ≥ 70.",
    },
    {
      icon: ScrollText,
      tone: "ai",
      value: fmtInt(stats.lowAdherence),
      label: "PRs com aderência < 60% ao card",
      info: "PRs vinculados a história com aderência abaixo de 60%.",
    },
    {
      icon: Bot,
      tone: "warn",
      value: fmtInt(stats.wrongCalls),
      label: "chamadas com modelo caro em tarefa trivial",
      info: "Commit e explicação de código feitos fora do modelo sugerido (Haiku).",
    },
    {
      icon: CircleDollarSign,
      tone: "ok",
      value: fmtBRL(stats.waste),
      label: "economia potencial do sugere-modelo",
      info: "Custo real − custo com o modelo sugerido, para chamadas fora da política.",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        eyebrow="KiroCópter · Build Once, Use Everywhere"
        title="O crew que age sobre os alertas do RADAR"
        subtitle="O RADAR mede e aponta. O KiroCópter age. São agentes, skills e um hook do Kiro que qualquer squad da VP Tech copia para o próprio repositório — agnóstico de stack."
        actions={
          <Button variant="primary" onClick={downloadKit} disabled={zipping}>
            {zipping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}{" "}
            Baixar o Crew (.zip)
          </Button>
        }
      />

      {/* O que o crew teria pegado no período */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <FadeIn key={k.label} delay={i * 0.05}>
              <Card className="card-glow flex h-full items-center gap-3 p-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${ICON_TONE[k.tone]}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="num text-xl font-semibold">{k.value}</div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <span>{k.label}</span>
                    <MetricInfo>{k.info}</MetricInfo>
                  </div>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Números do período filtrado ({scope.scopeLabel}).
      </p>

      {/* Agentes */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold">
        <Bot className="h-4 w-4 text-accent" /> Agentes do crew
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {AGENTS.map((a, i) => {
          const Icon = a.icon;
          const cat = CATEGORY[a.category];
          return (
            <FadeIn key={a.id} delay={i * 0.05}>
              <Card className="card-glow group flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge tone={cat.tone}>{cat.label}</Badge>
                </div>
                <div className="num mt-3 text-sm font-semibold">{a.id}</div>
                <div className="text-xs text-muted">{a.role}</div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">
                  {a.does}
                </p>
                <div className="mt-3 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                  <span className="font-semibold text-text">Resolve: </span>
                  {a.solves}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="subtle"
                    className="flex-1"
                    onClick={() => setViewing(a)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver agente
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      copy(a.md, `${a.id}.md copiado`, "Cole em .kiro/agents/")
                    }
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      {/* SPEC / BUILD / RUN */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold">
        <Workflow className="h-4 w-4 text-accent" /> Cobertura SPEC · BUILD ·
        RUN
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["spec", "build", "run"] as const).map((c, i) => {
          const cat = CATEGORY[c];
          const CatIcon =
            c === "spec" ? Sparkles : c === "build" ? Hammer : Wrench;
          const extra =
            c === "spec"
              ? "skills kirocop-spec-ears · spec de exemplo"
              : c === "build"
                ? "skill kirocop-sugere-modelo"
                : "hook pr-size-hint (sem LLM) · template de PR";
          const list = AGENTS.filter((a) => a.category === c);
          return (
            <FadeIn key={c} delay={i * 0.05}>
              <Card className="card-glow h-full p-5">
                <div className="flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-accent" />
                  <Badge tone={cat.tone}>{cat.label}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted">{cat.desc}</p>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {list.length ? (
                    list.map((a) => (
                      <li
                        key={a.id}
                        className="num flex items-center gap-2 text-text"
                      >
                        <a.icon className="h-3.5 w-3.5 text-accent" /> {a.id}
                      </li>
                    ))
                  ) : (
                    <li className="num flex items-center gap-2 text-muted">
                      — sem agente dedicado —
                    </li>
                  )}
                  <li className="flex items-center gap-2 text-muted">
                    <ShieldCheck className="h-3.5 w-3.5" /> {extra}
                  </li>
                </ul>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      {/* Fluxo */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold">
        <Rocket className="h-4 w-4 text-accent" /> Do pedido à ação
      </h2>
      <div className="grid gap-3">
        {FLOW.map((f, i) => (
          <FadeIn key={f.agent} delay={i * 0.05}>
            <Card className="card-glow flex flex-col items-stretch gap-3 p-4 md:flex-row md:items-center">
              <div className="flex-1 rounded-lg border border-risk/25 bg-risk/5 px-3 py-2 text-xs">
                <div className="font-semibold text-risk">Pedido</div>
                <div className="mt-0.5 text-muted">{f.trigger}</div>
              </div>
              <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-muted md:mx-0 md:rotate-0" />
              <div className="flex-1 rounded-lg border border-accent/25 bg-accent-soft px-3 py-2 text-xs">
                <div className="num font-semibold text-accent">{f.agent}</div>
                <div className="mt-0.5 text-muted">
                  acionado pelo radar-orchestrator
                </div>
              </div>
              <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-muted md:mx-0 md:rotate-0" />
              <div className="flex-1 rounded-lg border border-ok/25 bg-ok/5 px-3 py-2 text-xs">
                <div className="font-semibold text-ok">Resultado</div>
                <div className="mt-0.5 text-muted">{f.action}</div>
              </div>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* Skills + estrutura */}
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        <FadeIn>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" /> Skills de apoio
            </div>
            <p className="mt-1 text-xs text-muted">
              Os agentes usam sozinhos. Prefixo{" "}
              <span className="num">kirocop-</span> para não colidir com skills
              da squad.
            </p>
            <ul className="mt-3 space-y-2">
              {SKILLS_INFO.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2"
                >
                  <div className="num text-xs font-semibold text-text">
                    {s.id}
                  </div>
                  <div className="text-[11px] leading-relaxed text-muted">
                    {s.desc}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card className="card-glow flex h-full flex-col p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-accent" /> O que a squad
              instala
            </div>
            <p className="mt-1 text-xs text-muted">
              Descompacte o .zip na raiz do repositório. Os agentes aparecem no
              seletor de agentes do Kiro.
            </p>
            <pre className="num mt-3 flex-1 overflow-auto rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed text-muted">
              {KIT_TREE}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={downloadKit}
                disabled={zipping}
              >
                {zipping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}{" "}
                Baixar o Crew (.zip)
              </Button>
              <Button
                variant="subtle"
                onClick={() => copy(KIT_TREE, "Estrutura do kit copiada")}
              >
                <Copy className="h-4 w-4" /> Copiar árvore
              </Button>
            </div>
          </Card>
        </FadeIn>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
        <Bot className="h-4 w-4 shrink-0 text-accent" />O KiroCópter gera os
        dados de uso que o RADAR monitora. Build once em{" "}
        <span className="num">.kiro/</span>, use everywhere em qualquer squad.
      </div>

      {/* Modal do agente */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        {viewing && (
          <DialogContent
            className="max-w-2xl"
            title={<span className="num">{viewing.id}</span>}
            description={viewing.role}
            footer={
              <Button
                variant="primary"
                onClick={() =>
                  copy(
                    viewing.md,
                    `${viewing.id}.md copiado`,
                    "Cole em .kiro/agents/",
                  )
                }
              >
                <Copy className="h-4 w-4" /> Copiar .md
              </Button>
            }
          >
            <div className="space-y-4 text-sm">
              <Badge tone={CATEGORY[viewing.category].tone}>
                {CATEGORY[viewing.category].label}
              </Badge>
              <div>
                <div className="text-xs font-semibold text-muted">
                  O que faz
                </div>
                <p className="mt-0.5">{viewing.does}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">
                  Por que é reutilizável
                </div>
                <p className="mt-0.5">{viewing.reusable}</p>
              </div>
              <div>
                <div className="num text-xs font-semibold text-muted">
                  .kiro/agents/{viewing.id}.md
                </div>
                <pre className="num mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed text-muted">
                  {viewing.md}
                </pre>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
