import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  Bot,
  FileText,
  GitPullRequest,
  Image,
  ListChecks,
  Loader2,
  Settings2,
  Sparkles,
  Webhook,
} from "lucide-react";
import { FadeIn } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RECOMMENDED, ROUTING } from "@/mocks/kiro";
import type { KiroTask } from "@/mocks/types";

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

Colete dados por dois caminhos (nunca trave): git diff/log somente leitura para linhas e arquivos, pedindo ao usuário o que o git não dá (% IA, tempo de revisão, aderência, revisão assistida, testes); ou calcule a partir dos números colados. Se o PR tiver a secao Uso de IA (para o RADAR) com tarefa-principal, modelo-predominante, ia-pct e revisao-assistida (campos auto-declarados, nao telemetria), leia-os e cruze tarefa x modelo com a skill kirocop-sugere-modelo, apontando modelo inadequado quando houver.\n\nResponda em pt-BR com o score, a faixa, a lista de motivos (cada parcela que pesou) e — se 70+ — um pedido de re-review pronto para colar. Nunca invente números: peça ou assuma o default e diga qual assumiu.
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
- Custo desperdiçado = custo real − custo com o modelo sugerido.
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




export default function Crew() {
  const [zipping, setZipping] = useState(false);


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
        `## O que este PR faz\n\n## Card do Jira\nCloses \n\n## Uso de IA (para o RADAR)\n<!-- Campos estruturados e auto-declarados. O pr-auditor e scripts de CI leem daqui; nao e telemetria. Nao remova as chaves. -->\n- tarefa-principal: feature        <!-- commit | explicar-codigo | gerar-testes | refatorar | feature | spec | debug | review -->\n- modelo-predominante: Sonnet      <!-- Haiku | Sonnet | Opus | Fable -->\n- ia-pct: 70\n- revisao-assistida: sim           <!-- sim | nao -->\n\n## Checklist\n- [ ] Todos os critérios de aceite do card estão cobertos no diff\n- [ ] Testes adicionados/atualizados para o que mudou\n- [ ] Sem secrets ou PII no código/commits\n- [ ] PR em tamanho gerenciável (uma tarefa da spec por PR, quando possível)\n- [ ] Rodei o pr-auditor do KiroCópter e tratei os pontos críticos\n\n## Evidência\n`,
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

  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-6 md:flex-row">
        <div className="min-w-0 md:max-w-xl">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">KiroCópter · Build Once, Use Everywhere</div>
          <h1 className="text-2xl font-semibold tracking-tight">Veja o esquadrão em ação antes de baixar</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">4 agentes do Kiro + um exemplo spec-driven pronto. O RADAR aponta o problema, o KiroCópter resolve.</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <img src="/kirocopter.png" alt="KiroCópter" className="h-40 w-40 object-contain drop-shadow-[0_10px_28px_rgba(167,123,243,0.4)]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="ok">testado ao vivo no Kiro</Badge>
        <Badge tone="accent">cobre SPEC · BUILD · RUN</Badge>
        <Badge>instala em qualquer repo</Badge>
      </div>

      <FadeIn delay={0.05}>
        <Card className="card-glow relative mt-5 overflow-hidden p-6">
          <span className="absolute inset-y-0 left-0 w-1" style={{ background: "linear-gradient(180deg, var(--accent), var(--brand-yellow))" }} />
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ai">O maior ganho</div>
          <div className="mt-1.5 text-xl font-semibold">Exemplo spec-driven pronto pra copiar</div>
          <p className="mt-1 max-w-2xl text-sm text-muted">Trabalhar em modo Spec é difícil pra muita gente. O kit já vem com um exemplo completo e navegável: requirements, design e tasks. É só olhar e replicar.</p>
          <div className="mt-4 grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="rounded-lg border border-border bg-bg px-3 py-2.5"><div className="num text-xs text-accent">requirements.md</div><div className="mt-0.5 text-[11px] text-muted">critérios de aceite em EARS</div></div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted sm:block" />
            <div className="rounded-lg border border-border bg-bg px-3 py-2.5"><div className="num text-xs text-accent">design.md</div><div className="mt-0.5 text-[11px] text-muted">decisões e componentes</div></div>
            <ArrowRight className="mx-auto hidden h-4 w-4 text-muted sm:block" />
            <div className="rounded-lg border border-border bg-bg px-3 py-2.5"><div className="num text-xs text-accent">tasks.md</div><div className="mt-0.5 text-[11px] text-muted">1 task = 1 PR + modelo sugerido</div></div>
          </div>
        </Card>
      </FadeIn>

      <h2 className="mb-1 mt-8 text-lg font-semibold">A demo: um card de Jira e um PR (fictícios, prefixo DEMO-)</h2>
      <p className="mb-3 text-sm text-muted">Os agentes leem estes arquivos de verdade. Sem mock de UI, é o Kiro trabalhando.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <FadeIn>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><span className="num rounded-md bg-ai-soft px-1.5 py-0.5 text-[11px] text-ai">DEMO-001</span><span className="text-sm font-semibold">Checkout: validar CPF + cupom</span></div>
            <div className="mt-3 text-xs font-semibold">Critérios de aceite</div>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-muted">
              <li>Validar dígito verificador do CPF</li>
              <li>Aplicar cupom válido ao total</li>
              <li>Cupom expirado mantém preço cheio</li>
              <li>Testes de CPF inválido e cupom expirado</li>
            </ol>
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><span className="num rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">DEMO-PR-1</span><span className="text-sm font-semibold">feat: checkout (cupom + refactor)</span></div>
            <div className="mt-3 text-xs font-semibold">Sinais do PR</div>
            <div className="mt-1 space-y-1 text-xs text-muted">
              <div>% IA: 99 · revisão: 30s · ~660 linhas</div>
              <div>testes: não · CPF: não aparece no diff</div>
              <div>refactor amplo fora do escopo do card</div>
              <div className="italic text-accent">"aprovado em 30s, não bate com o card"</div>
            </div>
          </Card>
        </FadeIn>
      </div>

      <h2 className="mb-1 mt-8 text-lg font-semibold">O que cada agente devolve</h2>
      <p className="mb-3 text-sm text-muted">Resultado real da execução nos arquivos acima.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <FadeIn>
          <Card className="card-glow h-full border-l-4 border-l-risk p-5">
            <div className="flex items-start justify-between gap-2"><span className="num text-base font-semibold">pr-auditor</span><Badge tone="warn">RUN</Badge></div>
            <div className="num mt-2 text-[34px] font-bold leading-none text-risk">81<span className="text-sm font-medium text-muted">/100 · crítico</span></div>
            <p className="mt-2 text-xs text-muted">revisão 180x rápida demais · 99% IA · sem testes<br /><span className="font-semibold text-ok">gera pedido de re-review pronto pra colar</span></p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.05}>
          <Card className="card-glow h-full border-l-4 border-l-ai p-5">
            <div className="flex items-start justify-between gap-2"><span className="num text-base font-semibold">jira-adherence</span><Badge tone="accent">SPEC</Badge></div>
            <div className="num mt-2 text-[34px] font-bold leading-none text-ai">25%<span className="text-sm font-medium text-muted"> de aderência</span></div>
            <p className="mt-2 text-xs text-muted">crit. 1 (CPF) e 4 (testes): não encontrados<br />crit. 2 e 3 (cupom): parcial, função não ligada</p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="card-glow h-full border-l-4 border-l-ok p-5">
            <div className="flex items-start justify-between gap-2"><span className="num text-base font-semibold">analise-starter</span><Badge tone="ok">SPEC/BUILD</Badge></div>
            <p className="mt-3 text-xs text-muted">Abre o card (qualquer prefixo: CRPR, DENA, PLAT...), cria pasta + README no padrão da squad e <span className="text-accent">sugere o modelo certo antes de cada tarefa.</span></p>
          </Card>
        </FadeIn>
        <FadeIn delay={0.15}>
          <Card className="card-glow h-full border-l-4 border-l-accent p-5">
            <div className="flex items-start justify-between gap-2"><span className="num text-base font-semibold">radar-orchestrator</span><Badge>ORQUESTRA</Badge></div>
            <p className="mt-3 text-xs text-muted">A torre de controle. Você fala com um agente só; ele identifica o pedido e aciona o especialista certo, depois consolida a resposta.</p>
          </Card>
        </FadeIn>
      </div>

      <h2 className="mb-1 mt-10 text-lg font-semibold">Guardrails e Skills do kit</h2>
      <p className="mb-3 text-sm text-muted">As boas praticas vem embutidas: skills que os agentes usam sozinhos, um steering sempre ativo e um hook deterministico (sem LLM).</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SKILLS_INFO.map((s2, i) => (
          <FadeIn key={s2.id} delay={i * 0.04}>
            <Card className="card-glow h-full p-5">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-ai" /><span className="num text-sm font-semibold">{s2.id}</span></div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{s2.desc}</p>
              <Badge tone="ai" className="mt-3">skill</Badge>
            </Card>
          </FadeIn>
        ))}
        <FadeIn delay={0.16}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-accent" /><span className="num text-sm font-semibold">radar-crew</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Steering sempre ativo com o contexto e as regras do crew: pt-BR, evidencia, LGPD, PR enxuto.</p>
            <Badge tone="accent" className="mt-3">steering</Badge>
          </Card>
        </FadeIn>
        <FadeIn delay={0.2}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><Webhook className="h-4 w-4 text-warn" /><span className="num text-sm font-semibold">pr-size-hint</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Hook deterministico que avisa (nao bloqueia) quando o PR passa de 1000 linhas. Sem LLM, custo zero.</p>
            <Badge tone="warn" className="mt-3">hook</Badge>
          </Card>
        </FadeIn>
      </div>

      <h2 className="mb-1 mt-10 text-lg font-semibold">Padrao de PR do kit</h2>
      <p className="mb-3 text-sm text-muted">O template de PR (.github/pull_request_template.md) padroniza cada entrega em 5 grupos. O grupo Uso de IA e estruturado: o pr-auditor e scripts de CI leem dele.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <FadeIn delay={0}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /><span className="text-sm font-semibold">O que este PR faz</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">1 a 3 linhas sobre o que muda e por que. Da contexto rapido ao revisor.</p>
<Badge className="mt-3">resumo</Badge>
          </Card>
        </FadeIn>
        <FadeIn delay={0.04}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><GitPullRequest className="h-4 w-4 text-accent" /><span className="text-sm font-semibold">Card do Jira</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Closes CARD (qualquer prefixo). Liga a entrega a historia e aos criterios de aceite que o jira-adherence audita.</p>
<Badge className="mt-3">rastreabilidade</Badge>
          </Card>
        </FadeIn>
        <FadeIn delay={0.08}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-ai" /><span className="text-sm font-semibold">Uso de IA (para o RADAR)</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Bloco estruturado e auto-declarado (nao e telemetria). Campos machine-readable: o pr-auditor usa ia-pct e revisao-assistida no score e cruza tarefa x modelo com a kirocop-sugere-modelo pra apontar modelo inadequado.</p>
<div className="mt-3 flex flex-wrap gap-1"><Badge tone="ai">tarefa-principal</Badge><Badge tone="ai">modelo-predominante</Badge><Badge tone="ai">ia-pct</Badge><Badge tone="ai">revisao-assistida</Badge></div>
          </Card>
        </FadeIn>
        <FadeIn delay={0.12}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-accent" /><span className="text-sm font-semibold">Checklist</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Criterios cobertos no diff, testes, sem secrets/PII, tamanho gerenciavel e rodou o pr-auditor antes do review.</p>
<Badge className="mt-3">qualidade</Badge>
          </Card>
        </FadeIn>
        <FadeIn delay={0.16}>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2"><Image className="h-4 w-4 text-accent" /><span className="text-sm font-semibold">Evidencia</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Print, saida de teste, link ou trecho que prova que funciona.</p>
<Badge className="mt-3">prova</Badge>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.1}>
        <Card className="card-glow mt-8 flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold">Gostou? Leve o esquadrão pro seu repo</h3>
            <div className="num mt-1.5 text-xs text-muted">.kiro/ · 4 agentes · 4 skills · hook · spec de exemplo · template de PR</div>
            <div className="mt-3 flex gap-2"><Badge tone="ok">SPEC</Badge><Badge tone="ok">BUILD</Badge><Badge tone="ok">RUN</Badge></div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="primary" onClick={downloadKit} disabled={zipping}>{zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Recrutar o esquadrão</Button>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
