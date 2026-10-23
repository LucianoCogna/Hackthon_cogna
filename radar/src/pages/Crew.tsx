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
  GitPullRequest,
  Hammer,
  Loader2,
  Network,
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
  /** configuração real no formato de custom agent do Kiro (.kiro/agents/<id>.json) */
  config: Record<string, unknown>;
};

const BASE_RESOURCES = [
  "file://.kiro/steering/**/*.md",
  "skill://.kiro/skills/**/SKILL.md",
];
const READ_ONLY = {
  rules: [
    { capability: "fs_read", effect: "allow" },
    { capability: "shell", effect: "ask" },
  ],
};

const AGENTS: Agent[] = [
  {
    id: "radar-orchestrator",
    role: "Orquestrador do crew",
    category: "orchestrate",
    icon: Compass,
    does: "Recebe o pedido do Tech Lead (um PR, um card, uma dúvida de custo), aciona o agente especialista e devolve um plano de ação curto.",
    reusable:
      "A squad conversa com um agente só. A divisão de trabalho fica dentro do crew.",
    solves: "Transforma um alerta solto do RADAR em próximos passos.",
    config: {
      name: "radar-orchestrator",
      description:
        "RADAR Crew · Orquestrador: roteia o pedido para pr-auditor, jira-adherence ou model-router",
      tools: ["read", "subagent"],
      permissions: {
        rules: [
          { capability: "fs_read", effect: "allow" },
          { capability: "subagent", effect: "allow" },
        ],
      },
      toolsSettings: {
        subagent: {
          availableAgents: ["pr-auditor", "jira-adherence", "model-router"],
        },
      },
      resources: BASE_RESOURCES,
      prompt:
        "Você é o orquestrador do RADAR Crew. Identifique o tipo de pedido: risco de PR -> pr-auditor; aderência PR x história do Jira -> jira-adherence; escolha de modelo ou custo -> model-router. Delegue, consolide e responda em pt-BR com: diagnóstico, evidências e até 3 ações.",
    },
  },
  {
    id: "jira-adherence",
    role: "Auditor de aderência PR × história",
    category: "spec",
    icon: ScrollText,
    does: "Lê os critérios de aceite da história e o diff do PR. Marca cada critério como atendido, parcial ou não encontrado, com o trecho do diff como evidência.",
    reusable:
      "Toda squad tem Jira e PR. A mesma auditoria vale para as 8 squads.",
    solves:
      '"O PR não bate com o card": aponta o critério que ficou fora do diff.',
    config: {
      name: "jira-adherence",
      description:
        "RADAR Crew · SPEC: audita o diff do PR contra os critérios de aceite da história",
      tools: ["read", "shell"],
      permissions: READ_ONLY,
      resources: [...BASE_RESOURCES, "skill://spec-template-ears"],
      prompt:
        "Você audita aderência. Entrada: critérios de aceite (EARS ou Dado-Quando-Então) e o diff (git diff). Para cada critério responda: atendido | parcial | não encontrado, com arquivo:linha como evidência. Calcule aderência = atendidos / total. Nunca invente evidência.",
    },
  },
  {
    id: "model-router",
    role: "Roteador de modelo por tarefa",
    category: "build",
    icon: Network,
    does: "Indica o modelo adequado para cada tarefa (Haiku para commit, Sonnet para código, Opus para spec) e estima quanto o modelo atual custa a mais.",
    reusable: "Uma política única de roteamento para os ~120 devs da VP Tech.",
    solves:
      '"Modelo caro em tarefa trivial": tira Opus e Fable de commit e explicação de código.',
    config: {
      name: "model-router",
      description:
        "RADAR Crew · BUILD: recomenda o modelo certo por tarefa e estima o desperdício",
      tools: ["read"],
      permissions: { rules: [{ capability: "fs_read", effect: "allow" }] },
      resources: [...BASE_RESOURCES, "skill://model-router"],
      prompt:
        "Você aplica a política de roteamento da skill model-router. Classifique a tarefa, indique o modelo recomendado e os permitidos, e diga quando a tarefa nem precisa de LLM (hook ou script determinístico).",
    },
  },
  {
    id: "pr-auditor",
    role: "Auditor de risco de PR",
    category: "run",
    icon: GitPullRequest,
    does: "Calcula o risk score do PR com a fórmula do RADAR (revisão vs. esperado, % IA, aderência, testes, tamanho) e redige o pedido de re-review quando o score passa de 70.",
    reusable:
      "O mesmo guardrail roda no repositório e no CI de qualquer squad.",
    solves:
      '"99% IA, aprovado em 30s": vira um check de risco com motivos claros.',
    config: {
      name: "pr-auditor",
      description:
        "RADAR Crew · RUN: calcula o risk score do PR e sugere re-review",
      tools: ["read", "shell"],
      permissions: READ_ONLY,
      resources: [...BASE_RESOURCES, "skill://revisao-pr-checklist"],
      prompt:
        "Você calcula o PR Risk Score (0-100) do RADAR: 35*clamp(1-reviewRatio) + 25*(%IA/100) + 25*(1-aderência/100) + 10*(sem testes) + 5*(>1000 linhas) - 15*(revisão assistida). reviewRatio = tempo real / max(10, linhas/1000*30). Faixas: 0-39 saudável, 40-69 atenção, 70+ crítico. Liste os motivos e, se crítico, redija o pedido de re-review.",
    },
  },
];

const agentJson = (a: Agent) => JSON.stringify(a.config, null, 2);

// ---------------------------------------------------------------------------
// Fluxo: alerta do RADAR -> agente -> ação
// ---------------------------------------------------------------------------
const FLOW = [
  {
    trigger: "PR crítico no Radar de PRs",
    agent: "pr-auditor",
    action: "Pede re-review e anexa os motivos do score",
  },
  {
    trigger: "Aderência baixa em GitHub × Jira",
    agent: "jira-adherence",
    action: "Aponta o critério ausente e sugere o ajuste no PR",
  },
  {
    trigger: "Desperdício em Custo & Governança",
    agent: "model-router",
    action: "Recomenda o modelo certo e estima a economia",
  },
];

// ---------------------------------------------------------------------------
// Arquivos do kit (.zip)
// ---------------------------------------------------------------------------
const routingTable = (Object.keys(RECOMMENDED) as KiroTask[])
  .map((t) => `| ${t} | ${RECOMMENDED[t]} | ${ROUTING[t].join(", ")} |`)
  .join("\n");

const KIT_FILES: Record<string, string> = {
  "steering/radar-crew.md": `# RADAR Crew — contexto

O RADAR mede se a IA (Kiro + AI-DLC) melhora a engenharia em velocidade, qualidade e custo.
O RADAR Crew age sobre os alertas do RADAR.

## Regras do crew
- Responder em pt-BR, com evidências (arquivo:linha, número, link do PR/card).
- Métricas apoiam conversas. Nada de ranking punitivo de devs.
- Não colar secrets nem PII em prompts (LGPD).
- PR recomendado: até ~400 linhas, uma task da spec por PR.
`,
  "skills/model-router/SKILL.md": `---
name: model-router
description: Política de roteamento de modelo por tarefa da VP Tech. Usar ao escolher modelo, revisar custo de IA ou avaliar desperdício.
---

# Model router

| Tarefa | Recomendado | Permitidos |
|---|---|---|
${routingTable}

## Regras
- Nunca usar Opus ou Fable para commit, formatação ou pergunta simples.
- Fable só para arquitetura ou spec complexa.
- Commit, lint e formatação podem ser hook determinístico: custo R$ 0.
- Custo desperdiçado = custo real − custo com o modelo recomendado.
`,
  "skills/spec-template-ears/SKILL.md": `---
name: spec-template-ears
description: Template de critérios de aceite EARS e Dado-Quando-Então. Usar ao escrever ou auditar critérios de uma história.
---

# Critérios de aceite

- EARS: QUANDO <evento>, O SISTEMA DEVE <resposta>.
- Dado <contexto>, Quando <ação>, Então <resultado observável>.
- Um comportamento por critério, verificável no diff ou em teste.
`,
  "skills/revisao-pr-checklist/SKILL.md": `---
name: revisao-pr-checklist
description: Checklist de revisão de PR com código gerado por IA. Usar ao revisar PR ou calcular risco.
---

# Checklist de revisão

- [ ] PR declara % de IA e tem história do Jira vinculada.
- [ ] Tempo de revisão compatível com o tamanho (~30 min por 1.000 linhas, mínimo 10 min).
- [ ] Todos os critérios de aceite têm evidência no diff.
- [ ] Testes novos cobrem os critérios.
- [ ] Sem secrets, PII ou dependência nova sem justificativa.
`,
  "hooks/pr-size-guard.json": JSON.stringify(
    {
      version: "v1",
      hooks: [
        {
          name: "pr-size-guard",
          description:
            "Bloqueia git push quando o diff contra main passa de 400 linhas. Determinístico, sem LLM.",
          trigger: "PreToolUse",
          matcher: "shell",
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
  "hooks/scripts/pr-size-guard.mjs": `// Recebe o contexto do hook em stdin. Sai com código 2 para bloquear.
import { execSync } from 'node:child_process';

const LIMIT = 400;
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  if (!/git\\s+push/.test(input)) process.exit(0);
  let lines = 0;
  try {
    const stat = execSync('git diff --shortstat origin/main...HEAD', { encoding: 'utf8' });
    const add = Number(/(\\d+) insertion/.exec(stat)?.[1] ?? 0);
    const del = Number(/(\\d+) deletion/.exec(stat)?.[1] ?? 0);
    lines = add + del;
  } catch {
    process.exit(0); // sem origin/main: não bloqueia
  }
  if (lines > LIMIT) {
    console.error(\`RADAR Crew: diff com \${lines} linhas (limite \${LIMIT}). Quebre o PR por task da spec.\`);
    process.exit(2);
  }
  process.exit(0);
});
`,
  "README.md": `# RADAR Crew

Kit reutilizável de Kiro para qualquer squad da VP Tech. Copie a pasta \`.kiro/\` para a raiz do seu repositório.

| Agente | Categoria | Uso |
|---|---|---|
${AGENTS.map((a) => `| ${a.id} | ${CATEGORY[a.category].label} | ${a.role} |`).join("\n")}

- Agentes: \`.kiro/agents/\` (selecione no seletor de agentes do Kiro)
- Steering: \`.kiro/steering/radar-crew.md\`
- Skills: \`.kiro/skills/*/SKILL.md\`
- Hook: \`.kiro/hooks/pr-size-guard.json\` (requer Node.js)

Valide os campos na documentação oficial do Kiro antes de usar em produção.
`,
};

const KIT_TREE = `.kiro/
├─ agents/
${AGENTS.map((a) => `│  ├─ ${a.id}.json`).join("\n")}
├─ steering/
│  └─ radar-crew.md
├─ skills/
│  ├─ model-router/SKILL.md
│  ├─ spec-template-ears/SKILL.md
│  └─ revisao-pr-checklist/SKILL.md
├─ hooks/
│  ├─ pr-size-guard.json
│  └─ scripts/pr-size-guard.mjs
└─ README.md`;

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
      const root = zip.folder(".kiro")!;
      for (const a of AGENTS) root.file(`agents/${a.id}.json`, agentJson(a));
      for (const [path, content] of Object.entries(KIT_FILES))
        root.file(path, content);
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "radar-crew-kiro.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast.success("radar-crew-kiro.zip baixado", {
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
      info: "Commit e explicação de código feitos fora do modelo recomendado (Haiku).",
    },
    {
      icon: CircleDollarSign,
      tone: "ok",
      value: fmtBRL(stats.waste),
      label: "economia potencial do model-router",
      info: "Custo real − custo com o modelo recomendado, para chamadas fora da política.",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        eyebrow="RADAR Crew · Build Once, Use Everywhere"
        title="O crew que age sobre os alertas do RADAR"
        subtitle="O RADAR mede e aponta. O Crew age. São agentes, steering, skills e um hook do Kiro que qualquer squad da VP Tech copia para o próprio repositório."
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
                    <Eye className="h-3.5 w-3.5" /> Ver config
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      copy(
                        agentJson(a),
                        `${a.id}.json copiado`,
                        "Cole em .kiro/agents/",
                      )
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
              ? "skill spec-template-ears"
              : c === "build"
                ? "skill model-router"
                : "hook pr-size-guard (sem LLM)";
          return (
            <FadeIn key={c} delay={i * 0.05}>
              <Card className="card-glow h-full p-5">
                <div className="flex items-center gap-2">
                  <CatIcon className="h-4 w-4 text-accent" />
                  <Badge tone={cat.tone}>{cat.label}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted">{cat.desc}</p>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {AGENTS.filter((a) => a.category === c).map((a) => (
                    <li
                      key={a.id}
                      className="num flex items-center gap-2 text-text"
                    >
                      <a.icon className="h-3.5 w-3.5 text-accent" /> {a.id}
                    </li>
                  ))}
                  <li className="num flex items-center gap-2 text-muted">
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
        <Rocket className="h-4 w-4 text-accent" /> Do alerta à ação
      </h2>
      <div className="grid gap-3">
        {FLOW.map((f, i) => (
          <FadeIn key={f.agent} delay={i * 0.05}>
            <Card className="card-glow flex flex-col items-stretch gap-3 p-4 md:flex-row md:items-center">
              <div className="flex-1 rounded-lg border border-risk/25 bg-risk/5 px-3 py-2 text-xs">
                <div className="font-semibold text-risk">Alerta do RADAR</div>
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
                <div className="font-semibold text-ok">Ação</div>
                <div className="mt-0.5 text-muted">{f.action}</div>
              </div>
            </Card>
          </FadeIn>
        ))}
      </div>

      {/* Política + estrutura */}
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        <FadeIn>
          <Card className="card-glow h-full p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Network className="h-4 w-4 text-accent" /> Política da skill
              model-router
            </div>
            <p className="mt-1 text-xs text-muted">
              É a mesma tabela que a aba Custo & Governança usa para medir o
              desperdício.
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-surface-2 text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Tarefa</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Recomendado
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Permitidos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(RECOMMENDED) as KiroTask[]).map((task) => (
                    <tr key={task} className="border-t border-border">
                      <td className="px-3 py-1.5">{task}</td>
                      <td className="num px-3 py-1.5 text-accent">
                        {RECOMMENDED[task]}
                      </td>
                      <td className="num px-3 py-1.5 text-muted">
                        {ROUTING[task].join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        <Bot className="h-4 w-4 shrink-0 text-accent" />O Crew gera os dados de
        uso que o RADAR monitora. Build once em{" "}
        <span className="num">.kiro/</span>, use everywhere nas 8 squads.
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
                    agentJson(viewing),
                    `${viewing.id}.json copiado`,
                    "Cole em .kiro/agents/",
                  )
                }
              >
                <Copy className="h-4 w-4" /> Copiar .json
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
                  .kiro/agents/{viewing.id}.json
                </div>
                <pre className="num mt-1 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 text-[11px] leading-relaxed text-muted">
                  {agentJson(viewing)}
                </pre>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
