import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  LabelList,
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
import { FlaskConical, GitPullRequest, HeartHandshake, RefreshCw, Rocket, ShieldAlert, Timer } from 'lucide-react';
import { AiPctBar, DevAvatar, EmptyState, FadeIn, KpiCard, Legend, PageHeader, RiskBadge } from '@/components/shared';
import { ChartCard, axisProps, gridProps } from '@/components/charts';
import { ErrorState, LoadingState } from '@/components/ApiStates';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, Table, Td, Th } from '@/components/ui/misc';
import { Sheet, SheetContent, Tooltip } from '@/components/ui/overlay';
import { useGithubPrs, type GithubDev, type GithubPr } from '@/lib/jiraApi';
import { expectedReviewMin, mean, prRisk, prSize, reviewRatio, sum } from '@/lib/metrics';
import { fmtDate, fmtDuration, fmtInt, fmtNum, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';

const SQUAD = 'pricing';
const firstName = (n: string) => n.split(' ')[0];

type Row = {
  dev: GithubDev;
  committed: number;
  done: number;
  stories: number;
  prs: GithubPr[];
  perPoint: number | null;
  approval: number;
  linesPerPr: number;
  ai: number;
  tests: number;
  comments: number;
  risk: number;
  perSprint: number[];
};
type SortKey = 'name' | 'points' | 'prs' | 'perPoint' | 'approval' | 'linesPerPr' | 'ai' | 'tests' | 'risk';

const aiColor = (pct: number) => `color-mix(in srgb, var(--ai) ${Math.round(Math.min(100, pct))}%, var(--human))`;

function MiniBars({ values, highlight }: { values: number[]; highlight: number }) {
  const max = Math.max(1, ...values);
  return (
    <svg width={values.length * 7} height={22} aria-hidden>
      {values.map((v, i) => {
        const h = Math.max(1.5, (v / max) * 20);
        return <rect key={i} x={i * 7} y={22 - h} width={5} height={h} rx={1} fill={i === highlight ? 'var(--accent)' : 'var(--human)'} opacity={i === highlight ? 1 : 0.6} />;
      })}
    </svg>
  );
}

export default function GithubDevsLive({ switcher }: { switcher: React.ReactNode }) {
  const api = useGithubPrs(SQUAD, 6);
  const data = api.status === 'ok' ? api.data : null;
  const [sprintSel, setSprintSel] = useState<string>('last');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'points', dir: 'desc' });
  const [selected, setSelected] = useState<string | null>(null);

  const sprintIds = useMemo(() => {
    if (!data) return [] as string[];
    if (sprintSel === 'all') return data.sprints.map((s) => String(s.id));
    if (sprintSel === 'last') return data.sprints.length ? [String(data.sprints.at(-1)!.id)] : [];
    return [sprintSel];
  }, [data, sprintSel]);
  const sprintLabel = !data
    ? ''
    : sprintSel === 'all'
      ? `${data.sprints.length} sprints`
      : (data.sprints.find((s) => String(s.id) === sprintIds[0])?.name ?? '');

  const prs = useMemo(() => (data ? data.prs.filter((p) => sprintIds.includes(p.sprintId)) : []), [data, sprintIds]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const sprintOrder = data.sprints.map((s) => String(s.id));
    return data.devs.map((dev) => {
      const mine = prs.filter((p) => p.authorId === dev.id);
      const pts = sprintIds.map((id) => dev.points[id] ?? { committed: 0, done: 0, stories: 0 });
      const committed = sum(pts.map((p) => p.committed));
      return {
        dev,
        committed,
        done: sum(pts.map((p) => p.done)),
        stories: sum(pts.map((p) => p.stories)),
        prs: mine,
        perPoint: committed ? mine.length / committed : null,
        approval: mean(mine.map((p) => p.reviewTimeMin)),
        linesPerPr: mean(mine.map(prSize)),
        ai: mean(mine.map((p) => p.aiGeneratedPct)),
        tests: mine.length ? (100 * mine.filter((p) => p.testsAdded).length) / mine.length : 0,
        comments: sum(mine.map((p) => p.reviewComments)),
        risk: Math.round(mean(mine.map(prRisk))),
        perSprint: sprintOrder.map((id) => data.prs.filter((p) => p.authorId === dev.id && p.sprintId === id).length),
      };
    });
  }, [data, prs, sprintIds]);

  const sorted = useMemo(() => {
    const d = sort.dir === 'asc' ? 1 : -1;
    const val = (r: Row) =>
      sort.key === 'points' ? r.committed
      : sort.key === 'prs' ? r.prs.length
      : sort.key === 'perPoint' ? (r.perPoint ?? -1)
      : sort.key === 'approval' ? r.approval
      : sort.key === 'linesPerPr' ? r.linesPerPr
      : sort.key === 'ai' ? r.ai
      : sort.key === 'tests' ? r.tests
      : r.risk;
    return [...rows].sort((a, b) =>
      sort.key === 'name' ? a.dev.name.localeCompare(b.dev.name) * d : (val(a) - val(b)) * d || b.prs.length - a.prs.length,
    );
  }, [rows, sort]);

  const k = {
    prs: prs.length,
    committed: sum(rows.map((r) => r.committed)),
    done: sum(rows.map((r) => r.done)),
    approval: mean(prs.map((p) => p.reviewTimeMin)),
    expected: mean(prs.map(expectedReviewMin)),
    lines: mean(prs.map(prSize)),
    critical: prs.filter((p) => prRisk(p) >= 70).length,
  };

  const pointsVsPrs = rows
    .filter((r) => r.committed > 0 || r.prs.length > 0)
    .map((r) => ({ x: r.committed, y: r.prs.length, name: firstName(r.dev.name), full: r.dev.name, id: r.dev.id }));
  const paradox = prs.map((p) => ({
    id: p.id,
    x: Math.max(5, prSize(p)),
    y: Math.max(0.2, p.reviewTimeMin),
    ai: p.aiGeneratedPct,
    suspicious: prSize(p) > 1000 && reviewRatio(p) < 0.2,
    title: `${p.repo} #${p.number}`,
    author: data?.devs.find((d) => d.id === p.authorId)?.name,
  }));

  const th = (key: SortKey, label: string, className?: string) => (
    <Th
      sortable
      active={sort.key === key}
      dir={sort.dir}
      className={className}
      onSort={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }))}
    >
      {label}
    </Th>
  );
  const highlight = data ? data.sprints.findIndex((s) => String(s.id) === sprintIds[0]) : -1;

  return (
    <div>
      <PageHeader
        eyebrow="GitHub por Dev · Pricing"
        title="Quem está entregando, e como"
        subtitle={
          data ? (
            <>
              Pontos <b className="text-text">reais do Jira</b> por pessoa ao lado dos PRs. Período: <span className="num text-text">{sprintLabel}</span>.
            </>
          ) : (
            'Pontos do Jira e PRs por pessoa do squad de Pricing.'
          )
        }
        actions={
          <>
            {switcher}
            <Tooltip content="Buscar de novo (o cache dura 5 minutos)">
              <Button variant="outline" size="icon" onClick={api.reload} disabled={api.status === 'loading'} aria-label="Atualizar">
                <RefreshCw className={cn('h-4 w-4', api.status === 'loading' && 'animate-spin')} />
              </Button>
            </Tooltip>
          </>
        }
      />

      {api.status === 'loading' && <LoadingState label="Buscando pontos no Jira e montando os PRs…" />}
      {api.status === 'error' && <ErrorState error={api.error} onRetry={api.reload} />}

      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select
              label="Sprint"
              value={sprintSel}
              onChange={setSprintSel}
              options={[
                { value: 'last', label: `Última sprint (${data.sprints.at(-1)?.name ?? '—'})` },
                { value: 'all', label: `Todas as ${data.sprints.length} sprints` },
                ...[...data.sprints].reverse().map((s) => ({ value: String(s.id), label: s.name })),
              ]}
              className="w-[280px]"
            />
            <Badge tone="ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Pontos: Jira ao vivo
            </Badge>
            {data.source === 'simulado' ? (
              <Badge tone="warn">PRs: simulados a partir do Jira</Badge>
            ) : (
              <Badge tone="ok">PRs: GitHub ao vivo</Badge>
            )}
          </div>

          {data.source === 'simulado' && (
            <FadeIn className="mb-4">
              <div className="flex flex-wrap items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 px-4 py-3 text-xs text-muted">
                <GitPullRequest className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <span>
                  <b className="text-text">PRs simulados enquanto o token do GitHub aguarda aprovação.</b> Cada história real do Jira gera PRs do
                  responsável dela, dentro da sprint dela, em quantidade proporcional aos pontos (~1,2 PR por ponto). Tamanho, tempo de revisão
                  e % de IA são simulados. Quando o token for aprovado, os números passam a vir do GitHub sem mudar a tela.
                </span>
              </div>
            </FadeIn>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard index={0} icon={<GitPullRequest className="h-3.5 w-3.5" />} label="PRs no período" value={k.prs} format={fmtInt} />
            <KpiCard index={1} icon={<Rocket className="h-3.5 w-3.5" />} label="Pontos entregues (Jira)" value={k.done} format={(v) => `${fmtInt(v)} pts`}
              footnote={`${fmtInt(k.committed)} comprometidos`} info="Story points reais do Jira das histórias de cada pessoa nas sprints selecionadas." />
            <KpiCard index={2} label="PRs por ponto" value={k.committed ? k.prs / k.committed : 0} format={(v) => fmtNum(v, 1)}
              info="PRs abertos ÷ pontos comprometidos. Ajuda a ver quem quebra o trabalho em PRs pequenos. Não é medida de produtividade." />
            <KpiCard index={3} icon={<Timer className="h-3.5 w-3.5" />} label="Tempo médio de aprovação" value={k.approval} format={fmtDuration}
              footnote={`esperado ~${fmtDuration(k.expected)}`} />
            <KpiCard index={4} label="Linhas por PR" value={k.lines} format={fmtInt} />
            <KpiCard index={5} icon={<ShieldAlert className="h-3.5 w-3.5" />} label="PRs críticos" value={k.critical} format={fmtInt} tone={k.critical ? 'risk' : undefined}
              footnote="risk score ≥ 70" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <FadeIn delay={0.1}>
              <ChartCard
                title="Pontos do Jira × PRs por pessoa"
                description="Cada ponto é uma pessoa. Quem fica acima da tendência abre mais PRs por ponto de história."
                className="h-full"
              >
                {pointsVsPrs.length ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 16, right: 24, bottom: 18, left: -8 }}>
                        <CartesianGrid {...gridProps} vertical />
                        <XAxis type="number" dataKey="x" name="Pontos" {...axisProps} allowDecimals={false}
                          label={{ value: 'Pontos comprometidos (Jira)', position: 'insideBottom', offset: -10, fill: 'var(--muted)', fontSize: 11 }} />
                        <YAxis type="number" dataKey="y" name="PRs" {...axisProps} allowDecimals={false} />
                        <ZAxis range={[90, 90]} />
                        <RTooltip
                          cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as (typeof pointsVsPrs)[number];
                            return (
                              <div className="rounded-lg border border-border bg-surface-2/95 px-3 py-2 text-xs shadow-xl">
                                <div className="font-semibold">{d.full}</div>
                                <div className="num text-muted">
                                  {d.x} pts · {d.y} PRs{d.x ? ` · ${fmtNum(d.y / d.x, 1)} PR/pt` : ''}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={pointsVsPrs} fill="var(--accent)" isAnimationActive={false} onClick={(d: { id?: string }) => d?.id && setSelected(d.id)}>
                          <LabelList dataKey="name" position="top" offset={8} style={{ fill: 'var(--text)', fontSize: 11 }} />
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState description="Ninguém com pontos ou PRs nesse período." />
                )}
              </ChartCard>
            </FadeIn>
            <FadeIn delay={0.15}>
              <ChartCard
                title="O paradoxo: tamanho do PR × tempo de revisão"
                description="Cada ponto é um PR (escala log). Cor = % IA. Em vermelho: PRs com mais de 1.000 linhas revisados em menos de 20% do tempo esperado."
                actions={<Legend items={[{ label: 'Pouca IA', color: aiColor(5) }, { label: 'Muita IA', color: aiColor(95) }, { label: 'Suspeito', color: 'var(--risk)' }]} />}
                className="h-full"
              >
                {paradox.length ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 12, bottom: 18, left: -4 }}>
                        <CartesianGrid {...gridProps} vertical />
                        <XAxis type="number" dataKey="x" scale="log" domain={[5, 6000]} ticks={[10, 100, 1000, 5000]} tickFormatter={(v) => fmtInt(v)} {...axisProps}
                          label={{ value: 'Linhas alteradas (log)', position: 'insideBottom', offset: -10, fill: 'var(--muted)', fontSize: 11 }} />
                        <YAxis type="number" dataKey="y" scale="log" domain={[0.2, 600]} ticks={[0.5, 1, 5, 15, 60, 240]} tickFormatter={(v) => fmtDuration(v)} {...axisProps} width={52} />
                        <ZAxis range={[28, 28]} />
                        <ReferenceArea x1={1000} x2={6000} y1={0.2} y2={6} fill="var(--risk)" fillOpacity={0.06} stroke="var(--risk)" strokeOpacity={0.25} strokeDasharray="3 3" />
                        <ReferenceLine segment={[{ x: 5, y: 10 }, { x: 333, y: 10 }]} stroke="var(--muted)" strokeDasharray="4 4" />
                        <ReferenceLine segment={[{ x: 333, y: 10 }, { x: 6000, y: 180 }]} stroke="var(--muted)" strokeDasharray="4 4" />
                        <RTooltip
                          cursor={{ strokeDasharray: '3 3', stroke: 'var(--muted)' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as (typeof paradox)[number];
                            return (
                              <div className="rounded-lg border border-border bg-surface-2/95 px-3 py-2 text-xs shadow-xl">
                                <div className="font-semibold">{d.title}</div>
                                <div className="text-muted">{d.author}</div>
                                <div className="num mt-1">{fmtInt(d.x)} linhas · revisão {fmtDuration(d.y)} · <span className="text-ai">{d.ai}% IA</span></div>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={paradox.filter((p) => !p.suspicious)} isAnimationActive={false}>
                          {paradox.filter((p) => !p.suspicious).map((d) => <Cell key={d.id} fill={aiColor(d.ai)} fillOpacity={0.8} />)}
                        </Scatter>
                        <Scatter data={paradox.filter((p) => p.suspicious)} fill="var(--risk)" stroke="var(--surface)" strokeWidth={1.5} isAnimationActive={false} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState description="Nenhum PR nesse período." />
                )}
              </ChartCard>
            </FadeIn>
          </div>

          <FadeIn delay={0.2} className="mt-4">
            <Card className="overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <div className="text-sm font-semibold">Pessoas do squad de Pricing</div>
                <div className="text-xs text-muted">{sorted.length} pessoas com histórias no Jira · clique para ver os PRs</div>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <Table>
                  <thead>
                    <tr>
                      {th('name', 'Pessoa')}
                      {th('points', 'Pontos (Jira)', 'text-right')}
                      {th('prs', 'PRs', 'text-right')}
                      {th('perPoint', 'PR/pt', 'text-right')}
                      <Th>PRs/sprint</Th>
                      {th('approval', 'Aprovação', 'text-right')}
                      {th('linesPerPr', 'Linhas/PR', 'text-right')}
                      {th('ai', '% IA')}
                      {th('tests', 'Testes', 'text-right')}
                      {th('risk', 'Risco')}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.dev.id} onClick={() => setSelected(r.dev.id)} className="cursor-pointer transition-colors hover:bg-accent-soft/50">
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <DevAvatar name={r.dev.name} />
                            <div>
                              <div className="font-medium text-text">{r.dev.name}</div>
                              <div className="text-[11px] text-muted">{r.stories} história{r.stories === 1 ? '' : 's'}</div>
                            </div>
                          </div>
                        </Td>
                        <Td className="num text-right">
                          <span className="font-semibold">{r.committed}</span>
                          {r.committed !== r.done && <span className="text-xs text-muted"> ({r.done} entregues)</span>}
                        </Td>
                        <Td className="num text-right font-semibold">{r.prs.length}</Td>
                        <Td className="num text-right text-muted">{r.perPoint === null ? '—' : fmtNum(r.perPoint, 1)}</Td>
                        <Td><MiniBars values={r.perSprint} highlight={sprintSel === 'all' ? -1 : highlight} /></Td>
                        <Td className={cn('num text-right', r.prs.length > 0 && r.approval < 5 && 'text-risk')}>{r.prs.length ? fmtDuration(r.approval) : '—'}</Td>
                        <Td className="num text-right">{r.prs.length ? fmtInt(r.linesPerPr) : '—'}</Td>
                        <Td>{r.prs.length ? <AiPctBar value={r.ai} /> : '—'}</Td>
                        <Td className="num text-right">{r.prs.length ? fmtPct(r.tests) : '—'}</Td>
                        <Td>{r.prs.length ? <RiskBadge score={r.risk} /> : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          </FadeIn>

          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <HeartHandshake className="h-4 w-4" />
            Métricas são para apoiar conversas, não para ranking punitivo. PRs e pontos não são o mesmo que valor entregue.
          </p>
        </>
      )}

      <DevSheet row={rows.find((r) => r.dev.id === selected) ?? null} sprintLabel={sprintLabel} onClose={() => setSelected(null)} />
    </div>
  );
}

function DevSheet({ row, sprintLabel, onClose }: { row: Row | null; sprintLabel: string; onClose: () => void }) {
  const prs = row ? [...row.prs].sort((a, b) => prRisk(b) - prRisk(a)) : [];
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      {row && (
        <SheetContent
          title={
            <div className="flex items-center gap-3">
              <DevAvatar name={row.dev.name} size={40} />
              <div>
                {row.dev.name}
                <div className="mt-0.5 text-xs font-normal text-muted">Pricing · {sprintLabel}</div>
              </div>
            </div>
          }
          description="Pontos reais do Jira e PRs do período"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Pontos (Jira)', `${row.committed}`],
              ['PRs', `${row.prs.length}`],
              ['Aprovação média', row.prs.length ? fmtDuration(row.approval) : '—'],
              ['Com testes', row.prs.length ? fmtPct(row.tests) : '—'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-surface-2/70 p-3">
                <div className="text-[11px] text-muted">{l}</div>
                <div className="num mt-1 text-lg font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">PRs (mais arriscados primeiro)</h4>
          {prs.length === 0 ? (
            <EmptyState description="Nenhum PR no período." />
          ) : (
            <div className="space-y-2">
              {prs.map((p) => (
                <div key={p.id} className="rounded-lg border border-border bg-surface-2/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.title}</div>
                      <div className="num text-[11px] text-muted">
                        {p.repo} #{p.number} · {fmtDate(p.createdAt)} · {p.mergedAt ? 'mergeado' : 'aberto'}
                      </div>
                    </div>
                    <RiskBadge score={prRisk(p)} />
                  </div>
                  <div className="num mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span>{fmtInt(prSize(p))} linhas</span>
                    <span>revisão {fmtDuration(p.reviewTimeMin)}</span>
                    <span className="flex items-center gap-1">IA <AiPctBar value={p.aiGeneratedPct} /></span>
                    {p.jiraKey ? <span className="text-accent">{p.jiraKey}</span> : <Badge tone="warn">sem história</Badge>}
                    {p.jiraAdherence !== null && <span>aderência {p.jiraAdherence}%</span>}
                    {p.testsAdded && <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> testes</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      )}
    </Sheet>
  );
}
