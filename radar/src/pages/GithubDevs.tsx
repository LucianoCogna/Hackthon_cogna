import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { HeartHandshake, Search, UserRound } from 'lucide-react';
import { useApp, useScope } from '@/app/store';
import { AiPctBar, DevAvatar, EmptyState, FadeIn, KpiCard, Legend, PageHeader, RiskBadge, SquadTag } from '@/components/shared';
import { ChartCard, ChartTooltip, TrendChart, axisProps, gridProps } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Select, Table, Td, Th } from '@/components/ui/misc';
import { Sheet, SheetContent } from '@/components/ui/overlay';
import { devs, devById, ME_ID } from '@/mocks/devs';
import { squadById, squads } from '@/mocks/squads';
import { sprints, sprintById } from '@/mocks/sprints';
import type { Dev, PullRequest } from '@/mocks/types';
import { expectedReviewMin, groupBy, mean, prRisk, prSize, reviewRatio, sum } from '@/lib/metrics';
import { fmtDate, fmtDuration, fmtInt, fmtNum, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';

type Row = {
  dev: Dev;
  prs: number;
  approval: number;
  linesPerPr: number;
  added: number;
  removed: number;
  ai: number;
  comments: number;
  tests: number;
  risk: number;
  perSprint: number[];
};
type SortKey = 'name' | 'prs' | 'approval' | 'linesPerPr' | 'added' | 'ai' | 'comments' | 'tests' | 'risk';

function buildRow(dev: Dev, prs: PullRequest[], all: PullRequest[]): Row {
  const allBy = groupBy(all, (p) => p.sprintId);
  return {
    dev,
    prs: prs.length,
    approval: mean(prs.map((p) => p.reviewTimeMin)),
    linesPerPr: mean(prs.map(prSize)),
    added: sum(prs.map((p) => p.linesAdded)),
    removed: sum(prs.map((p) => p.linesRemoved)),
    ai: mean(prs.map((p) => p.aiGeneratedPct)),
    comments: sum(prs.map((p) => p.reviewComments)),
    tests: prs.length ? (100 * prs.filter((p) => p.testsAdded).length) / prs.length : 0,
    risk: Math.round(mean(prs.map(prRisk))),
    perSprint: sprints.map((s) => (allBy[s.id] ?? []).length),
  };
}

/** Mini-barras em SVG puro (leve para dezenas de linhas). */
function MiniBars({ values, highlightFrom = 9 }: { values: number[]; highlightFrom?: number }) {
  const max = Math.max(1, ...values);
  const w = 4;
  const gap = 2;
  return (
    <svg width={values.length * (w + gap)} height={22} aria-hidden>
      {values.map((v, i) => {
        const h = Math.max(1.5, (v / max) * 20);
        return (
          <rect key={i} x={i * (w + gap)} y={22 - h} width={w} height={h} rx={1} fill={i >= highlightFrom ? 'var(--ai)' : 'var(--human)'} opacity={i >= highlightFrom ? 0.9 : 0.6} />
        );
      })}
    </svg>
  );
}

const aiColor = (pct: number) => {
  // sequencial em uma única matiz (violeta): pouco IA = cinza-violeta claro, muito IA = violeta pleno
  const t = Math.min(1, pct / 100);
  return `color-mix(in srgb, var(--ai) ${Math.round(t * 100)}%, var(--human))`;
};

export default function GithubDevs() {
  const scope = useScope();
  const { persona } = useApp();
  const [seniority, setSeniority] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'prs', dir: 'desc' });
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const by = groupBy(scope.prs, (p) => p.authorId);
    const allBy = groupBy(scope.allPrs, (p) => p.authorId);
    return devs
      .filter((d) => scope.inSquad(d.squadId))
      .filter((d) => seniority === 'all' || d.seniority === seniority)
      .filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()))
      .map((d) => buildRow(d, by[d.id] ?? [], allBy[d.id] ?? []));
  }, [scope, seniority, q]);

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === 'name') return a.dev.name.localeCompare(b.dev.name) * dir;
      return ((a[sort.key] as number) - (b[sort.key] as number)) * dir;
    });
  }, [rows, sort]);

  const scatter = useMemo(
    () =>
      scope.prs.map((p) => ({
        id: p.id,
        x: Math.max(5, prSize(p)),
        y: Math.max(0.2, p.reviewTimeMin),
        ai: p.aiGeneratedPct,
        suspicious: prSize(p) > 1000 && reviewRatio(p) < 0.2,
        title: `${p.repo} #${p.number}`,
        author: devById[p.authorId]?.name,
      })),
    [scope.prs],
  );
  const suspicious = scatter.filter((s) => s.suspicious);
  const normal = scatter.filter((s) => !s.suspicious);

  const bySquad = useMemo(
    () =>
      squads
        .filter((s) => scope.inSquad(s.id))
        .map((s) => ({ name: s.name, prs: scope.prs.filter((p) => p.squadId === s.id).length / scope.scopeSprints.length })),
    [scope],
  );

  const me = persona === 'dev' ? rows.find((r) => r.dev.id === ME_ID) : undefined;
  const meSquadRows = me ? rows.filter((r) => r.dev.squadId === me.dev.squadId && r.prs > 0) : [];

  const setSortKey = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));
  const th = (key: SortKey, label: string, className?: string) => (
    <Th sortable active={sort.key === key} dir={sort.dir} onSort={() => setSortKey(key)} className={className}>
      {label}
    </Th>
  );

  return (
    <div>
      <PageHeader
        eyebrow="GitHub por Dev"
        title="Quem está entregando, e como"
        subtitle={<>PRs, tamanho, tempo de aprovação e uso de IA por pessoa. Período: <span className="num text-text">{scope.scopeLabel}</span>.</>}
      />

      {me && (
        <FadeIn className="mb-4">
          <Card className="card-glow border-accent/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <DevAvatar name="Você" me size={30} />
              <div>
                <div className="text-sm font-semibold">Suas métricas vs. a média do squad {squadById[me.dev.squadId].name}</div>
                <div className="text-xs text-muted">Visível só para você. Serve para você se comparar com o time, sem ranking.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { l: 'PRs no período', v: me.prs, t: mean(meSquadRows.map((r) => r.prs)), f: fmtInt },
                { l: 'Linhas por PR', v: me.linesPerPr, t: mean(meSquadRows.map((r) => r.linesPerPr)), f: fmtInt },
                { l: 'Tempo de aprovação', v: me.approval, t: mean(meSquadRows.map((r) => r.approval)), f: fmtDuration },
                { l: '% IA', v: me.ai, t: mean(meSquadRows.map((r) => r.ai)), f: (v: number) => fmtPct(v) },
                { l: 'PRs com testes', v: me.tests, t: mean(meSquadRows.map((r) => r.tests)), f: (v: number) => fmtPct(v) },
              ].map((m) => (
                <div key={m.l} className="rounded-lg bg-surface-2/70 p-3">
                  <div className="text-[11px] text-muted">{m.l}</div>
                  <div className="num mt-1 text-lg font-semibold">{m.f(m.v)}</div>
                  <div className="num text-[11px] text-muted">time: {m.f(m.t)}</div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard index={0} label="PRs no período" value={scope.prs.length} format={fmtInt} />
        <KpiCard index={1} label="Linhas por PR (média)" value={mean(scope.prs.map(prSize))} format={fmtInt} tone="warn"
          info="Linhas adicionadas + removidas por PR." />
        <KpiCard index={2} label="Tempo médio de aprovação" value={mean(scope.prs.map((p) => p.reviewTimeMin))} format={fmtDuration}
          footnote={`esperado ~${fmtDuration(mean(scope.prs.map(expectedReviewMin)))}`} info="Abertura → aprovação. Esperado: 30 min por 1.000 linhas, mínimo 10 min." />
        <KpiCard index={3} label="PRs > 1.000 linhas e revisão < 20% do esperado" value={suspicious.length} format={fmtInt} tone="risk"
          footnote={scope.prs.length ? `${fmtPct((100 * suspicious.length) / scope.prs.length, 1)} dos PRs` : undefined} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <FadeIn delay={0.1} className="xl:col-span-2">
          <ChartCard
            title="O paradoxo: tamanho do PR × tempo de revisão"
            description="Cada ponto é um PR (escala logarítmica). Cor = % gerado por IA. Em vermelho: PRs com mais de 1.000 linhas revisados em menos de 20% do tempo esperado."
            info="A linha tracejada é o tempo de revisão esperado (30 min por 1.000 linhas, mínimo 10 min). Pontos bem abaixo dela foram revisados rápido demais."
            actions={
              <Legend
                items={[
                  { label: 'Pouca IA', color: aiColor(5) },
                  { label: 'Muita IA', color: aiColor(95) },
                  { label: 'Suspeito', color: 'var(--risk)' },
                  { label: 'Esperado', color: 'var(--muted)', dashed: true },
                ]}
              />
            }
          >
            {scatter.length === 0 ? (
              <EmptyState description="Nenhum PR no filtro atual." />
            ) : (
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 12, bottom: 18, left: -4 }}>
                    <CartesianGrid {...gridProps} vertical />
                    <XAxis type="number" dataKey="x" name="Linhas" scale="log" domain={[5, 8000]} ticks={[10, 100, 1000, 5000]}
                      tickFormatter={(v) => fmtInt(v)} {...axisProps}
                      label={{ value: 'Linhas alteradas (log)', position: 'insideBottom', offset: -10, fill: 'var(--muted)', fontSize: 11 }} />
                    <YAxis type="number" dataKey="y" name="Revisão" scale="log" domain={[0.2, 600]} ticks={[0.5, 1, 5, 15, 60, 240]}
                      tickFormatter={(v) => fmtDuration(v)} {...axisProps} width={52} />
                    <ZAxis range={[28, 28]} />
                    <ReferenceArea x1={1000} x2={8000} y1={0.2} y2={6} fill="var(--risk)" fillOpacity={0.06} stroke="var(--risk)" strokeOpacity={0.25} strokeDasharray="3 3"
                      label={{ value: 'Zona do paradoxo', position: 'insideBottomRight', fill: 'var(--risk)', fontSize: 11, fontWeight: 600 }} />
                    <ReferenceLine segment={[{ x: 5, y: 10 }, { x: 333, y: 10 }]} stroke="var(--muted)" strokeDasharray="4 4" />
                    <ReferenceLine segment={[{ x: 333, y: 10 }, { x: 8000, y: 240 }]} stroke="var(--muted)" strokeDasharray="4 4" />
                    <RTooltip
                      cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as (typeof scatter)[number];
                        return (
                          <div className="rounded-lg border border-border bg-surface-2/95 px-3 py-2 text-xs shadow-xl">
                            <div className="font-semibold">{d.title}</div>
                            <div className="text-muted">{d.author}</div>
                            <div className="num mt-1 grid grid-cols-2 gap-x-3">
                              <span className="text-muted">Linhas</span><span>{fmtInt(d.x)}</span>
                              <span className="text-muted">Revisão</span><span>{fmtDuration(d.y)}</span>
                              <span className="text-muted">% IA</span><span className="text-ai">{d.ai}%</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={normal} isAnimationActive={false}>
                      {normal.map((d) => (
                        <Cell key={d.id} fill={aiColor(d.ai)} fillOpacity={0.75} />
                      ))}
                    </Scatter>
                    <Scatter data={suspicious} fill="var(--risk)" stroke="var(--surface)" strokeWidth={1.5} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </FadeIn>
        <FadeIn delay={0.15}>
          <ChartCard title="PRs por squad" description="Média de PRs por sprint no período" className="h-full">
            {bySquad.length ? (
              <div style={{ height: Math.max(120, bySquad.length * 38) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySquad} layout="vertical" margin={{ top: 0, right: 30, left: 8, bottom: 0 }} barCategoryGap={8}>
                    <CartesianGrid {...gridProps} horizontal={false} vertical />
                    <XAxis type="number" {...axisProps} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                    <RTooltip content={<ChartTooltip format={(v) => `${fmtNum(v, 1)} PRs/sprint`} />} cursor={{ fill: 'var(--accent-soft)' }} />
                    <Bar isAnimationActive={false} dataKey="prs" name="PRs/sprint" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={16}
                      label={{ position: 'right', fill: 'var(--muted)', fontSize: 11, formatter: (v: number) => fmtNum(v, 1) }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState />
            )}
          </ChartCard>
        </FadeIn>
      </div>

      {/* Tabela */}
      <FadeIn delay={0.2} className="mt-4">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
            <div className="mr-auto">
              <div className="text-sm font-semibold">Devs</div>
              <div className="text-xs text-muted">{sorted.length} pessoas · clique para ver o perfil</div>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select
              label="Senioridade"
              value={seniority}
              onChange={setSeniority}
              options={[
                { value: 'all', label: 'Toda senioridade' },
                { value: 'Jr', label: 'Júnior' },
                { value: 'Pl', label: 'Pleno' },
                { value: 'Sr', label: 'Sênior' },
                { value: 'Esp', label: 'Especialista' },
              ]}
              className="w-[170px]"
            />
          </div>
          {sorted.length === 0 ? (
            <div className="p-5">
              <EmptyState description="Nenhum dev encontrado com esses filtros." />
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto">
              <Table>
                <thead>
                  <tr>
                    {th('name', 'Dev')}
                    <Th>Squad</Th>
                    {th('prs', 'PRs', 'text-right')}
                    <Th>PRs/sprint</Th>
                    {th('approval', 'Aprovação', 'text-right')}
                    {th('linesPerPr', 'Linhas/PR', 'text-right')}
                    {th('added', 'Linhas +/−', 'text-right')}
                    {th('ai', '% IA')}
                    {th('comments', 'Coment. review', 'text-right')}
                    {th('tests', 'Testes', 'text-right')}
                    {th('risk', 'Risco')}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr
                      key={r.dev.id}
                      onClick={() => setSelected(r.dev.id)}
                      className={cn('cursor-pointer transition-colors hover:bg-accent-soft/50', r.dev.isMe && 'bg-accent-soft/40')}
                    >
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <DevAvatar name={r.dev.name} me={r.dev.isMe} />
                          <div>
                            <div className="font-medium text-text">
                              {r.dev.name}
                              {r.dev.role === 'Tech Lead' && <Badge className="ml-1.5" tone="accent">TL</Badge>}
                            </div>
                            <div className="text-[11px] text-muted">{r.dev.seniority}</div>
                          </div>
                        </div>
                      </Td>
                      <Td><SquadTag id={r.dev.squadId} /></Td>
                      <Td className="num text-right font-semibold">{r.prs}</Td>
                      <Td><MiniBars values={r.perSprint} /></Td>
                      <Td className={cn('num text-right', r.approval > 0 && r.approval < 5 && 'text-risk')}>{r.prs ? fmtDuration(r.approval) : '—'}</Td>
                      <Td className="num text-right">{r.prs ? fmtInt(r.linesPerPr) : '—'}</Td>
                      <Td className="num text-right text-xs">
                        <span className="text-ok">+{fmtInt(r.added)}</span> <span className="text-risk">−{fmtInt(r.removed)}</span>
                      </Td>
                      <Td>{r.prs ? <AiPctBar value={r.ai} /> : '—'}</Td>
                      <Td className="num text-right">{r.comments}</Td>
                      <Td className="num text-right">{r.prs ? fmtPct(r.tests) : '—'}</Td>
                      <Td>{r.prs ? <RiskBadge score={r.risk} /> : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </FadeIn>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted">
        <HeartHandshake className="h-4 w-4" />
        Métricas são para apoiar conversas, não para ranking punitivo. Commits e PRs não são o mesmo que valor entregue.
      </p>

      <DevSheet devId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
const BUCKETS = [
  { label: '< 1 min', max: 1 },
  { label: '1–5 min', max: 5 },
  { label: '5–15 min', max: 15 },
  { label: '15–30 min', max: 30 },
  { label: '30–60 min', max: 60 },
  { label: '> 1h', max: Infinity },
];

function DevSheet({ devId, onClose }: { devId: string | null; onClose: () => void }) {
  const scope = useScope();
  const dev = devId ? devById[devId] : null;
  const data = useMemo(() => {
    if (!dev) return null;
    const mine = scope.allPrs.filter((p) => p.authorId === dev.id);
    const squadAll = scope.allPrs.filter((p) => p.squadId === dev.squadId);
    const squadDevs = devs.filter((d) => d.squadId === dev.squadId).length;
    const perSprint = sprints.map((s) => {
      const ps = mine.filter((p) => p.sprintId === s.id);
      return { label: `S${s.index + 1}`, prs: ps.length, lines: mean(ps.map(prSize)) };
    });
    const inScope = mine.filter((p) => scope.scopeSprints.some((s) => s.id === p.sprintId));
    const squadScope = squadAll.filter((p) => scope.scopeSprints.some((s) => s.id === p.sprintId));
    const hist = BUCKETS.map((b, i) => ({
      label: b.label,
      n: inScope.filter((p) => p.reviewTimeMin < b.max && (i === 0 || p.reviewTimeMin >= BUCKETS[i - 1].max)).length,
    }));
    const recent = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    const cmp = [
      { l: 'PRs por sprint', me: inScope.length / scope.scopeSprints.length, sq: squadScope.length / scope.scopeSprints.length / squadDevs, f: (v: number) => fmtNum(v, 1) },
      { l: 'Linhas por PR', me: mean(inScope.map(prSize)), sq: mean(squadScope.map(prSize)), f: fmtInt },
      { l: 'Tempo de aprovação', me: mean(inScope.map((p) => p.reviewTimeMin)), sq: mean(squadScope.map((p) => p.reviewTimeMin)), f: fmtDuration },
      { l: '% IA', me: mean(inScope.map((p) => p.aiGeneratedPct)), sq: mean(squadScope.map((p) => p.aiGeneratedPct)), f: (v: number) => fmtPct(v) },
      { l: 'PRs com testes', me: (100 * inScope.filter((p) => p.testsAdded).length) / Math.max(1, inScope.length), sq: (100 * squadScope.filter((p) => p.testsAdded).length) / Math.max(1, squadScope.length), f: (v: number) => fmtPct(v) },
      { l: 'Risk score médio', me: mean(inScope.map(prRisk)), sq: mean(squadScope.map(prRisk)), f: fmtInt },
    ];
    return { perSprint, hist, recent, cmp };
  }, [dev, scope]);

  return (
    <Sheet open={!!dev} onOpenChange={(o) => !o && onClose()}>
      {dev && data && (
        <SheetContent
          title={
            <div className="flex items-center gap-3">
              <DevAvatar name={dev.name} size={40} me={dev.isMe} />
              <div>
                <div>{dev.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs font-normal text-muted">
                  <SquadTag id={dev.squadId} /> · {dev.role} · {dev.seniority}
                </div>
              </div>
            </div>
          }
          description={<>Perfil no GitHub · período {scope.scopeLabel}</>}
        >
          <div className="space-y-5">
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">PRs por sprint</h4>
              <TrendChart data={data.perSprint} series={[{ key: 'prs', name: 'PRs', color: 'var(--accent)', type: 'area' }]} height={150} format={(v) => fmtInt(v)} />
            </section>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Linhas por PR (média)</h4>
              <TrendChart data={data.perSprint} series={[{ key: 'lines', name: 'Linhas/PR', color: 'var(--ai)', type: 'area' }]} height={150} format={(v) => fmtInt(v)} showMilestoneLabels={false} />
            </section>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Distribuição do tempo de aprovação</h4>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hist} margin={{ top: 14, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} interval={0} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis {...axisProps} allowDecimals={false} />
                    <RTooltip content={<ChartTooltip format={(v) => `${v} PRs`} />} cursor={{ fill: 'var(--accent-soft)' }} />
                    <Bar isAnimationActive={false} dataKey="n" name="PRs" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: 'var(--muted)', fontSize: 10 }}>
                      {data.hist.map((h, i) => (
                        <Cell key={h.label} fill={i === 0 ? 'var(--risk)' : i === 1 ? 'var(--warn)' : 'var(--accent)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Comparação com a média do squad</h4>
              <div className="overflow-hidden rounded-lg border border-border">
                {data.cmp.map((c) => (
                  <div key={c.l} className="grid grid-cols-3 border-b border-border/60 px-3 py-2 text-sm last:border-0">
                    <span className="text-muted">{c.l}</span>
                    <span className="num text-right font-semibold">{c.f(c.me)}</span>
                    <span className="num text-right text-muted">squad {c.f(c.sq)}</span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Últimos PRs</h4>
              <div className="space-y-2">
                {data.recent.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border bg-surface-2/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.title}</div>
                        <div className="num text-[11px] text-muted">
                          {p.repo} #{p.number} · {fmtDate(p.createdAt)} · {sprintById[p.sprintId].name}
                        </div>
                      </div>
                      <RiskBadge score={prRisk(p)} />
                    </div>
                    <div className="num mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                      <span>{fmtInt(prSize(p))} linhas</span>
                      <span>revisão {fmtDuration(p.reviewTimeMin)}</span>
                      <span className="flex items-center gap-1">IA <AiPctBar value={p.aiGeneratedPct} /></span>
                      {p.jiraKey && <span>{p.jiraKey}</span>}
                    </div>
                  </div>
                ))}
                {data.recent.length === 0 && <EmptyState description="Sem PRs para este dev." />}
              </div>
            </section>
            <p className="flex items-center gap-2 text-[11px] text-muted">
              <UserRound className="h-3.5 w-3.5" /> Use estes dados para apoiar 1:1s e mentorias, não para ranking.
            </p>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
