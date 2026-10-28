import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Award, Bot, CheckCheck, GraduationCap, Lightbulb, Medal, Sparkles, Trophy, Users, Workflow } from 'lucide-react';
import { useApp, useScope } from '@/app/store';
import { DevAvatar, EmptyState, FadeIn, KpiCard, Legend, PageHeader, SquadTag } from '@/components/shared';
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import { Sheet, SheetContent } from '@/components/ui/overlay';
import { devs, devById } from '@/mocks/devs';
import { MODELS, ROUTING, TASKS, RECOMMENDED } from '@/mocks/kiro';
import type { KiroModel, KiroUsage } from '@/mocks/types';
import { groupBy, kiroStats, modelFits, sum, type KiroStats } from '@/lib/metrics';
import { fmtBRL, fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';

export const MODEL_COLOR: Record<KiroModel, string> = {
  'Claude Haiku': 'var(--series-3)',
  'Claude Sonnet': 'var(--series-1)',
  'Claude Opus': 'var(--series-4)',
  'Claude Fable': 'var(--series-2)',
};
export const shortModel = (m: KiroModel) => m.replace('Claude ', '');

const effColor = (v: number) => (v >= 70 ? 'var(--ok)' : v >= 50 ? 'var(--warn)' : 'var(--risk)');

function practices(s: KiroStats, us: KiroUsage[]) {
  const out: string[] = [];
  out.push(`Usa spec-driven em ${fmtPct(s.specDrivenRate * 100)} das features`);
  const trivial = us.filter((u) => u.taskType === 'commit' || u.taskType === 'explicar código');
  const haiku = sum(trivial.filter((u) => u.model === 'Claude Haiku').map((u) => u.calls)) / Math.max(1, sum(trivial.map((u) => u.calls)));
  out.push(`Usa Haiku em ${fmtPct(haiku * 100)} das tarefas simples`);
  out.push(`${fmtPct(s.acceptanceRate * 100)} das sugestões aceitas e mantidas`);
  const skills = groupBy(us.filter((u) => u.usedSkill), (u) => u.usedSkill as string);
  const top = Object.entries(skills).sort((a, b) => b[1].length - a[1].length)[0];
  if (top) out.push(`Skill favorita: ${top[0]}`);
  return out;
}

export function suggestions(s: KiroStats, us: KiroUsage[]) {
  const out: string[] = [];
  if (s.modelFitRate < 0.75) {
    const bad = us.filter((u) => !modelFits(u));
    const byTask = groupBy(bad, (u) => u.taskType);
    const worst = Object.entries(byTask).sort((a, b) => sum(b[1].map((u) => u.calls)) - sum(a[1].map((u) => u.calls)))[0];
    if (worst) out.push(`Troque para ${shortModel(RECOMMENDED[worst[0] as keyof typeof RECOMMENDED])} em "${worst[0]}". Hoje é a tarefa com mais chamadas em modelo inadequado.`);
  }
  if (s.specDrivenRate < 0.5) out.push('Comece features pelo fluxo spec → design → tasks. Veja o guardrail 02-spec-driven-development.md.');
  if (s.skillUsageRate < 0.3) out.push('Use as skills corporativas (commit-conventional, gerar-testes-jest) para tarefas repetitivas.');
  if (s.acceptanceRate < 0.65) out.push('Muitas sugestões descartadas: refine os prompts e use steering files com os padrões do projeto.');
  if (!out.length) out.push('Uso exemplar. Que tal compartilhar suas práticas no próximo Kiro Clinic?');
  return out;
}

export default function AiUsage() {
  const scope = useScope();
  const [selected, setSelected] = useState<string | null>(null);
  // Dev: só o próprio uso (o escopo já vem filtrado), sem rankings do time
  const { session } = useApp();
  const individual = session?.persona === 'dev';

  const scopeDevs = devs.filter((d) => scope.inSquad(d.squadId));
  const byDev = useMemo(() => groupBy(scope.usage, (u) => u.devId), [scope.usage]);
  const ranking = useMemo(
    () =>
      scopeDevs
        .filter((d) => (byDev[d.id] ?? []).length >= 8)
        .map((d) => ({ dev: d, s: kiroStats(byDev[d.id]), us: byDev[d.id] }))
        .sort((a, b) => b.s.efficiency - a.s.efficiency),
    [byDev, scopeDevs],
  );

  const all = kiroStats(scope.usage);
  const prevAll = kiroStats(scope.prevUsage);
  const active = scopeDevs.filter((d) => (byDev[d.id] ?? []).length > 0).length;
  const prevActive = new Set(scope.prevUsage.map((u) => u.devId)).size;
  const hasPrev = scope.prevUsage.length > 0;
  const delta = (a: number, b: number) => (hasPrev && b ? ((a - b) / b) * 100 : null);

  const skillCounts = Object.entries(groupBy(scope.usage.filter((u) => u.usedSkill), (u) => u.usedSkill as string))
    .map(([k, v]) => ({ k, n: sum(v.map((u) => u.calls)) }))
    .sort((a, b) => b.n - a.n);

  // Tarefa × modelo
  const taskModel = TASKS.map((t) => {
    const us = scope.usage.filter((u) => u.taskType === t);
    const row: Record<string, number | string> = { task: t };
    for (const m of MODELS) row[m] = sum(us.filter((u) => u.model === m).map((u) => u.calls));
    const total = sum(us.map((u) => u.calls));
    row.inadequate = total ? Math.round((100 * sum(us.filter((u) => !modelFits(u)).map((u) => u.calls))) / total) : 0;
    return row;
  });

  const top = ranking.slice(0, 10);
  const bottom = ranking.slice(-5).reverse().filter((r) => !top.includes(r));
  const champions = ranking.slice(0, 3);

  return (
    <div>
      <PageHeader
        eyebrow="Uso de IA · Kiro / AWS"
        title={individual ? 'Como você está usando o Kiro' : 'Como o time está usando o Kiro'}
        subtitle={
          <>
            {individual && <>Só você vê estes números. </>}
            Adoção, aceitação, uso spec-driven e escolha de modelo. Fonte futura: métricas de uso do Kiro na AWS{' '}
            <Badge tone="warn">a validar quais campos a AWS expõe</Badge>. Neste protótipo, todos os dados são simulados.
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {individual ? (
          <KpiCard index={0} icon={<Bot className="h-3.5 w-3.5" />} label="Chamadas ao Kiro" value={all.calls} format={fmtInt}
            delta={delta(all.calls, prevAll.calls)} info="Total de chamadas que você fez ao Kiro no período." />
        ) : (
          <KpiCard index={0} icon={<Users className="h-3.5 w-3.5" />} label="Devs ativos no Kiro" value={(100 * active) / Math.max(1, scopeDevs.length)} format={(v) => fmtPct(v)}
            footnote={`${active} de ${scopeDevs.length}`} delta={delta(active, prevActive)} info="Devs com pelo menos uma interação com o Kiro no período." />
        )}
        <KpiCard index={1} icon={<CheckCheck className="h-3.5 w-3.5" />} label="Taxa de aceitação" value={all.acceptanceRate * 100} format={(v) => fmtPct(v)}
          delta={delta(all.acceptanceRate, prevAll.acceptanceRate)} info="% das sugestões aceitas e mantidas no código (ponderado por chamadas)." />
        <KpiCard index={2} icon={<Workflow className="h-3.5 w-3.5" />} label="Uso spec-driven" value={all.specDrivenRate * 100} format={(v) => fmtPct(v)}
          delta={delta(all.specDrivenRate, prevAll.specDrivenRate)} info="% das tarefas de feature/spec que seguiram o fluxo requirements → design → tasks." />
        <KpiCard index={3} icon={<Award className="h-3.5 w-3.5" />} label="Eficiência média" value={all.efficiency} format={(v) => `${fmtInt(v)}/100`} tone="ai"
          delta={delta(all.efficiency, prevAll.efficiency)}
          info="40% aceitação + 30% modelo adequado à tarefa + 20% spec-driven + 10% uso de skills." />
        <Card className="card-glow p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted"><Sparkles className="h-3.5 w-3.5" /> Skills mais usadas</div>
          <div className="mt-2 space-y-1.5">
            {skillCounts.slice(0, 3).map((s, i) => (
              <div key={s.k} className="flex items-center justify-between gap-2 text-xs">
                <span className="num truncate text-text"><span className="text-muted">{i + 1}.</span> {s.k}</span>
                <span className="num text-muted">{fmtInt(s.n)}</span>
              </div>
            ))}
            {!skillCounts.length && <span className="text-xs text-muted">Sem uso de skills</span>}
          </div>
        </Card>
      </div>

      {/* Champions */}
      {!individual && champions.length > 0 && (
        <FadeIn delay={0.1} className="mt-4">
          <Card className="relative overflow-hidden border-ai/30 p-5">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ai/15 blur-3xl" />
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-ai" />
              <div>
                <div className="text-sm font-semibold">Kiro Champions</div>
                <div className="text-xs text-muted">Os 3 devs com o melhor uso no período, e o que eles fazem de diferente</div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {champions.map((c, i) => (
                <button key={c.dev.id} onClick={() => setSelected(c.dev.id)}
                  className="card-glow cursor-pointer rounded-xl border border-border bg-surface-2/60 p-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <DevAvatar name={c.dev.name} size={40} />
                      <Medal className={cn('absolute -bottom-1 -right-1 h-4 w-4', i === 0 ? 'text-warn' : 'text-muted')} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{c.dev.name}</div>
                      <SquadTag id={c.dev.squadId} />
                    </div>
                    <div className="num text-2xl font-semibold text-ai">{fmtInt(c.s.efficiency)}</div>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted">
                    {practices(c.s, c.us).map((p) => (
                      <li key={p} className="flex gap-1.5"><span className="text-ai">✓</span>{p}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </Card>
        </FadeIn>
      )}

      {individual ? (
        <FadeIn delay={0.1} className="mt-4">
          <ChartCard title="Seu perfil de uso" description={`Modelos, tarefas, skills e sugestões · ${scope.scopeLabel}`}>
            <UsageProfile us={scope.usage} />
          </ChartCard>
        </FadeIn>
      ) : (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.15}>
          <ChartCard title="Destaques" description="Top 10 em eficiência de uso do Kiro" info="Clique em um dev para ver o perfil de uso e sugestões." className="h-full">
            <RankList rows={top} onSelect={setSelected} />
          </ChartCard>
        </FadeIn>
        <FadeIn delay={0.2}>
          <ChartCard
            title={<span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-accent" /> Oportunidades de melhoria</span>}
            description="Quem pode ganhar mais com pareamento e guardrails. Não é ranking de desempenho."
            className="h-full"
          >
            <RankList rows={bottom} onSelect={setSelected} mentoring />
          </ChartCard>
        </FadeIn>
      </div>
      )}

      <div className="mt-4">
        <FadeIn delay={0.25}>
          <ChartCard
            title="Tipo de tarefa × modelo usado"
            description="Chamadas por tarefa, empilhadas por modelo. À direita, o % de chamadas com modelo inadequado."
            info="Modelo adequado: commit/explicar código → Haiku; testes/refatorar/debug → Sonnet; feature/review → Sonnet ou Opus; Fable só para spec complexa."
            actions={<Legend items={MODELS.map((m) => ({ label: shortModel(m), color: MODEL_COLOR[m] }))} />}
            className="h-full"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskModel} layout="vertical" margin={{ top: 0, right: 92, left: 8, bottom: 0 }} barCategoryGap={7}>
                  <CartesianGrid {...gridProps} horizontal={false} vertical />
                  <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtInt(v)} />
                  <YAxis type="category" dataKey="task" {...axisProps} width={100} />
                  <RTooltip content={<ChartTooltip format={(v) => `${fmtInt(v)} chamadas`} />} cursor={{ fill: 'var(--accent-soft)' }} />
                  {MODELS.map((m, i) => (
                    <Bar isAnimationActive={false} key={m} dataKey={m} name={shortModel(m)} stackId="a" fill={MODEL_COLOR[m]} stroke="var(--surface)" strokeWidth={1}
                      radius={i === MODELS.length - 1 ? [0, 4, 4, 0] : 0}>
                      {i === MODELS.length - 1 && (
                        <LabelList dataKey="inadequate" position="right" offset={8}
                          content={(props) => {
                            const { x, y, width, height, value } = props as { x: number; y: number; width: number; height: number; value: number };
                            return (
                              <text x={x + width + 8} y={y + height / 2} dy={4} fontSize={11} fontWeight={600}
                                fill={value >= 25 ? 'var(--risk)' : value >= 10 ? 'var(--warn)' : 'var(--muted)'} className="num">
                                {value}% inadequado
                              </text>
                            );
                          }} />
                      )}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>
      </div>

      <UsageSheet devId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function RankList({ rows, onSelect, mentoring }: { rows: { dev: (typeof devs)[number]; s: KiroStats }[]; onSelect: (id: string) => void; mentoring?: boolean }) {
  if (!rows.length) return <EmptyState description="Sem dados de uso suficientes no filtro atual." />;
  return (
    <div className="space-y-1">
      {rows.map((r, i) => (
        <button key={r.dev.id} onClick={() => onSelect(r.dev.id)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
          <span className="num w-5 text-xs text-muted">{mentoring ? <Lightbulb className="h-3.5 w-3.5 text-accent" /> : i + 1}</span>
          <DevAvatar name={r.dev.name} size={26} me={r.dev.isMe} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">{r.dev.name}</div>
            <SquadTag id={r.dev.squadId} className="text-[11px]" />
          </div>
          <div className="hidden w-28 sm:block"><Progress value={r.s.efficiency} color={mentoring ? 'var(--accent)' : effColor(r.s.efficiency)} /></div>
          <span className="num w-8 text-right text-sm font-semibold">{fmtInt(r.s.efficiency)}</span>
        </button>
      ))}
    </div>
  );
}

function UsageSheet({ devId, onClose }: { devId: string | null; onClose: () => void }) {
  const scope = useScope();
  const dev = devId ? devById[devId] : null;
  const us = useMemo(() => (dev ? scope.usage.filter((u) => u.devId === dev.id) : []), [dev, scope.usage]);
  return (
    <Sheet open={!!dev} onOpenChange={(o) => !o && onClose()}>
      {dev && (
        <SheetContent
          title={<div className="flex items-center gap-3"><DevAvatar name={dev.name} size={40} /><div>{dev.name}<div className="mt-0.5 text-xs font-normal text-muted"><SquadTag id={dev.squadId} /></div></div></div>}
          description={`Perfil de uso do Kiro · ${scope.scopeLabel}`}
        >
          <UsageProfile us={us} />
        </SheetContent>
      )}
    </Sheet>
  );
}

function UsageProfile({ us }: { us: KiroUsage[] }) {
  const s = kiroStats(us);
  const models = MODELS.map((m) => ({ m: shortModel(m), n: sum(us.filter((u) => u.model === m).map((u) => u.calls)), color: MODEL_COLOR[m] }));
  const tasks = TASKS.map((t) => ({ t, n: sum(us.filter((u) => u.taskType === t).map((u) => u.calls)) })).sort((a, b) => b.n - a.n);
  const skills = Object.entries(groupBy(us.filter((u) => u.usedSkill), (u) => u.usedSkill as string)).sort((a, b) => b[1].length - a[1].length);
  const maxTask = Math.max(1, ...tasks.map((t) => t.n));
  if (us.length === 0) return <EmptyState description="Sem uso do Kiro no período." />;
  return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Eficiência', `${fmtInt(s.efficiency)}`],
            ['Aceitação', fmtPct(s.acceptanceRate * 100)],
            ['Modelo adequado', fmtPct(s.modelFitRate * 100)],
            ['Spec-driven', fmtPct(s.specDrivenRate * 100)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-surface-2/70 p-3">
              <div className="text-[11px] text-muted">{l}</div>
              <div className="num mt-1 text-lg font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
          <span className="text-muted">Custo no período</span>
          <span className="num font-semibold">{fmtBRL(s.cost)} <span className="text-xs font-normal text-risk">({fmtBRL(s.wasted)} desperdiçados)</span></span>
        </div>
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Modelos usados</h4>
          <div className="flex h-3 overflow-hidden rounded-full">
            {models.filter((m) => m.n).map((m) => (
              <div key={m.m} style={{ width: `${(100 * m.n) / s.calls}%`, background: m.color }} className="border-r-2 border-surface last:border-0" />
            ))}
          </div>
          <div className="mt-2"><Legend items={models.map((m) => ({ label: `${m.m} ${fmtPct((100 * m.n) / Math.max(1, s.calls))}`, color: m.color }))} /></div>
        </section>
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Tarefas</h4>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <div key={t.t} className="flex items-center gap-2 text-xs">
                <span className="w-28 text-muted">{t.t}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-ai" style={{ width: `${(100 * t.n) / maxTask}%` }} /></div>
                <span className="num w-10 text-right">{t.n}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Skills e steering</h4>
          <div className="flex flex-wrap gap-1.5">
            {skills.length ? skills.map(([k, v]) => <Badge key={k} tone="ai"><span className="num">{k}</span> · {v.length}</Badge>) : <span className="text-xs text-muted">Nenhuma skill usada</span>}
          </div>
        </section>
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Bot className="h-3.5 w-3.5" /> Sugestões personalizadas</h4>
          <ul className="space-y-2">
            {suggestions(s, us).map((x) => (
              <li key={x} className="flex gap-2 rounded-lg border border-accent/25 bg-accent-soft p-3 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{x}</li>
            ))}
          </ul>
        </section>
      </div>
  );
}

