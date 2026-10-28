import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { CheckCircle2, AlertTriangle, XCircle, Search, Link2Off, RotateCcw, FileText, GitPullRequest, ListChecks, Sparkles } from 'lucide-react';
import { useScope } from '@/app/store';
import { AiPctBar, AiSeal, DevAvatar, EmptyState, FadeIn, KpiCard, PageHeader, RiskBadge, SquadTag } from '@/components/shared';
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input, Progress, Select, Table, Tabs, Td, Th } from '@/components/ui/misc';
import { Dialog, DialogContent } from '@/components/ui/overlay';
import { criterionStatuses, type CriterionStatus } from '@/mocks/stories';
import { squads } from '@/mocks/squads';
import { devById } from '@/mocks/devs';
import type { PullRequest, Story } from '@/mocks/types';
import { groupBy, mean, prRisk, prSize, storyAdherence, sum } from '@/lib/metrics';
import { fmtDuration, fmtInt, fmtNum, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { rng } from '../../shared/random';
import { JiraIndicators } from './JiraIndicators';
import { mockJiraSprints } from '@/mocks/jiraBoard';
import { REF_DATE, sprintById } from '@/mocks/sprints';

const adhColor = (v: number | null) =>
  v === null ? 'var(--muted)' : v >= 80 ? 'var(--ok)' : v >= 60 ? 'var(--warn)' : 'var(--risk)';

const statusTone = { Done: 'ok', 'In Progress': 'accent', 'To Do': 'neutral' } as const;
const statusLabel = { Done: 'Concluída', 'In Progress': 'Em andamento', 'To Do': 'A fazer' } as const;

type Row = { story: Story; prs: PullRequest[]; adherence: number | null };

type CriteriaSource = 'campo' | 'descrição' | 'template' | 'nenhum';
/** Onde a história guarda os critérios (simulado): specs piores tendem a ter template vazio ou nenhum critério. */
function criteriaSourceOf(s: Story): CriteriaSource {
  const w: [CriteriaSource, number][] =
    s.specQuality >= 70 ? [['campo', 60], ['descrição', 35], ['template', 3], ['nenhum', 2]]
    : s.specQuality >= 50 ? [['campo', 40], ['descrição', 40], ['template', 12], ['nenhum', 8]]
    : [['campo', 15], ['descrição', 30], ['template', 30], ['nenhum', 25]];
  let x = rng('criteria-src:' + s.key).float(0, 100);
  for (const [k, v] of w) if ((x -= v) < 0) return k;
  return 'campo';
}

export default function GithubJira() {
  const scope = useScope();
  const [view, setView] = useState<'indicadores' | 'aderencia'>('indicadores');
  // quadro no formato do Jira, simulado (sem conexão com o Jira): janela do período, mínimo de 6 sprints
  const board = useMemo(
    () => mockJiraSprints(scope.inSquad, Math.max(6, scope.filters.period)),
    [scope.inSquad, scope.filters.period],
  );
  const boardSprintId = scope.filters.sprintId === 'all' ? 'all' : String(sprintById[scope.filters.sprintId].index + 1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sortKey, setSortKey] = useState<'adherence' | 'prs' | 'reopen' | 'points'>('adherence');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Row | null>(null);

  const prsByStory = useMemo(() => groupBy(scope.allPrs.filter((p) => p.jiraKey), (p) => p.jiraKey as string), [scope.allPrs]);

  const rows: Row[] = useMemo(
    () =>
      scope.stories.map((s) => {
        const prs = prsByStory[s.key] ?? [];
        return { story: s, prs, adherence: storyAdherence(prs) };
      }),
    [scope.stories, prsByStory],
  );

  const filtered = useMemo(() => {
    const f = rows
      .filter((r) => status === 'all' || r.story.status === status)
      .filter((r) => !q || (r.story.key + ' ' + r.story.title).toLowerCase().includes(q.toLowerCase()));
    const d = dir === 'asc' ? 1 : -1;
    const val = (r: Row) =>
      sortKey === 'adherence' ? (r.adherence ?? 101) : sortKey === 'prs' ? r.prs.length : sortKey === 'reopen' ? r.story.reopenCount : r.story.points;
    return f.sort((a, b) => (val(a) - val(b)) * d);
  }, [rows, q, status, sortKey, dir]);

  const withPrs = rows.filter((r) => r.prs.length > 0);
  const k = {
    adherence: mean(scope.prs.map((p) => p.jiraAdherence).filter((v): v is number => v !== null)),
    prsPerStory: mean(withPrs.map((r) => r.prs.length)),
    unlinked: scope.prs.length ? (100 * scope.prs.filter((p) => !p.jiraKey).length) / scope.prs.length : 0,
    reopened: scope.stories.filter((s) => s.reopenCount > 0).length,
    reopenTotal: sum(scope.stories.map((s) => s.reopenCount)),
    spec: mean(scope.stories.map((s) => s.specQuality)),
    stories: scope.stories.length,
    points: sum(scope.stories.map((s) => s.points)),
  };
  const sources = scope.stories.map(criteriaSourceOf);
  const kc = {
    withCriteria: sources.length ? (100 * sources.filter((c) => c === 'campo' || c === 'descrição').length) / sources.length : 0,
    template: sources.filter((c) => c === 'template').length,
  };
  const specBuckets = [
    { label: '0–39', n: scope.stories.filter((s) => s.specQuality < 40).length, color: 'var(--risk)' },
    { label: '40–59', n: scope.stories.filter((s) => s.specQuality >= 40 && s.specQuality < 60).length, color: 'var(--warn)' },
    { label: '60–79', n: scope.stories.filter((s) => s.specQuality >= 60 && s.specQuality < 80).length, color: 'var(--accent)' },
    { label: '80–100', n: scope.stories.filter((s) => s.specQuality >= 80).length, color: 'var(--ok)' },
  ];
  const criteriaSources = [
    { label: 'Campo', n: sources.filter((c) => c === 'campo').length, color: 'var(--accent)' },
    { label: 'Descrição', n: sources.filter((c) => c === 'descrição').length, color: 'var(--accent)' },
    { label: 'Template', n: kc.template, color: 'var(--warn)' },
    { label: 'Nenhum', n: sources.filter((c) => c === 'nenhum').length, color: 'var(--warn)' },
  ];

  const bySquad = squads
    .filter((s) => scope.inSquad(s.id) && scope.prs.some((p) => p.squadId === s.id))
    .map((s) => ({
      name: s.name,
      v: Math.round(mean(scope.prs.filter((p) => p.squadId === s.id && p.jiraAdherence !== null).map((p) => p.jiraAdherence!))),
    }))
    .sort((a, b) => a.v - b.v);

  const hist = [
    { label: '1 PR', n: withPrs.filter((r) => r.prs.length === 1).length },
    { label: '2–3', n: withPrs.filter((r) => r.prs.length >= 2 && r.prs.length <= 3).length },
    { label: '4–6', n: withPrs.filter((r) => r.prs.length >= 4 && r.prs.length <= 6).length },
    { label: '7+', n: withPrs.filter((r) => r.prs.length >= 7).length },
  ];

  const corr = withPrs.map((r) => ({ x: r.story.specQuality, y: r.adherence ?? 0, key: r.story.key, title: r.story.title }));
  const pearson = useMemo(() => {
    if (corr.length < 3) return 0;
    const mx = mean(corr.map((c) => c.x));
    const my = mean(corr.map((c) => c.y));
    const num = sum(corr.map((c) => (c.x - mx) * (c.y - my)));
    const den = Math.sqrt(sum(corr.map((c) => (c.x - mx) ** 2)) * sum(corr.map((c) => (c.y - my) ** 2)));
    return den ? num / den : 0;
  }, [corr]);

  const sortTh = (key: typeof sortKey, label: string, className?: string) => (
    <Th
      sortable
      active={sortKey === key}
      dir={dir}
      className={className}
      onSort={() => {
        if (sortKey === key) setDir(dir === 'asc' ? 'desc' : 'asc');
        else {
          setSortKey(key);
          setDir(key === 'adherence' ? 'asc' : 'desc');
        }
      }}
    >
      {label}
    </Th>
  );

  return (
    <div>
      <PageHeader
        eyebrow="GitHub × Jira"
        title="O código entregue bate com a história?"
        subtitle="Entrega por sprint, aderência dos PRs aos critérios de aceite, idas e vindas de requisito e qualidade das specs. Dados simulados neste protótipo."
        actions={<AiSeal />}
      />

      <div className="mb-4">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: 'indicadores', label: 'Indicadores da sprint' },
            { value: 'aderencia', label: 'Aderência PR × história' },
          ]}
        />
      </div>

      {view === 'indicadores' ? (
        <JiraIndicators sprints={board} sprintId={boardSprintId} today={REF_DATE} />
      ) : (
      <>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard index={0} icon={<FileText className="h-3.5 w-3.5" />} label="Histórias" value={k.stories} format={fmtInt}
          footnote={`${fmtInt(k.points)} pts comprometidos`} info="Itens do quadro (sem subtarefas e épicos) nas sprints do período." />
        <KpiCard index={1} icon={<ListChecks className="h-3.5 w-3.5" />} label="Com critérios de aceite" value={kc.withCriteria} format={(v) => fmtPct(v)}
          tone={kc.withCriteria < 60 ? 'warn' : undefined} footnote={kc.template ? `${kc.template} com template não preenchido` : undefined}
          info="Histórias com critérios no campo próprio do Jira ou numa seção 'Critérios de aceite' da descrição." />
        <KpiCard index={2} icon={<Sparkles className="h-3.5 w-3.5" />} label="Qualidade média da spec" value={k.spec} format={(v) => `${fmtInt(v)}/100`}
          info="Clareza da spec avaliada por IA: critérios testáveis, escopo, dependências e casos de borda." />
        <KpiCard index={3} icon={<RotateCcw className="h-3.5 w-3.5" />} label="Histórias reabertas" value={k.reopened} format={fmtInt} footnote={`${k.reopenTotal} idas e vindas`}
          info="Histórias que voltaram de status por mudança ou dúvida de requisito." />
        <KpiCard index={4} label="Aderência média PR × história" value={k.adherence} format={(v) => fmtPct(v)} tone={k.adherence < 75 ? 'warn' : undefined}
          info="Percentual dos critérios de aceite da história encontrados no diff do PR, segundo a análise por LLM." />
        <KpiCard index={5} icon={<GitPullRequest className="h-3.5 w-3.5" />} label="PRs por história" value={k.prsPerStory} format={(v) => fmtNum(v, 1)}
          footnote={`${fmtInt(scope.prs.length)} PRs no período`} info="Média de PRs vinculados a cada história que tem ao menos um PR." />
        <KpiCard index={6} icon={<Link2Off className="h-3.5 w-3.5" />} label="PRs sem história vinculada" value={k.unlinked} format={(v) => fmtPct(v, 1)}
          info="PRs sem chave do Jira no título ou na branch. Não é possível auditar a aderência deles." />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FadeIn delay={0.1}>
          <ChartCard title="Aderência média por squad" description="% dos critérios de aceite atendidos" className="h-full">
            {bySquad.length ? (
              <div style={{ height: Math.max(140, bySquad.length * 34) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bySquad} layout="vertical" margin={{ top: 0, right: 36, left: 8, bottom: 0 }}>
                    <CartesianGrid {...gridProps} horizontal={false} vertical />
                    <XAxis type="number" domain={[0, 100]} {...axisProps} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                    <RTooltip content={<ChartTooltip format={(v) => fmtPct(v)} />} cursor={{ fill: 'var(--accent-soft)' }} />
                    <Bar isAnimationActive={false} dataKey="v" name="Aderência" radius={[0, 4, 4, 0]} barSize={14}
                      label={{ position: 'right', fill: 'var(--muted)', fontSize: 11, formatter: (v: number) => `${v}%` }}>
                      {bySquad.map((b) => <Cell key={b.name} fill={adhColor(b.v)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState />}
          </ChartCard>
        </FadeIn>
        <FadeIn delay={0.15}>
          <ChartCard title="PRs por história" description="Quantas histórias precisaram de 1, 2–3, 4–6 ou 7+ PRs" className="h-full">
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <RTooltip content={<ChartTooltip format={(v) => `${v} histórias`} />} cursor={{ fill: 'var(--accent-soft)' }} />
                  <Bar isAnimationActive={false} dataKey="n" name="Histórias" radius={[4, 4, 0, 0]} barSize={42} label={{ position: 'top', fill: 'var(--muted)', fontSize: 11 }}>
                    {hist.map((h, i) => <Cell key={h.label} fill={i === 3 ? 'var(--warn)' : 'var(--accent)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>
        <FadeIn delay={0.2}>
          <ChartCard
            title="Qualidade da spec × aderência"
            description={<>Cada ponto é uma história. Correlação: <span className="num font-semibold text-text">r = {fmtNum(pearson, 2)}</span></>}
            info="Specs mal escritas geram entregas desalinhadas: quanto menor a qualidade da spec, menor a aderência dos PRs."
            className="h-full"
          >
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, left: -20, bottom: 14 }}>
                  <CartesianGrid {...gridProps} vertical />
                  <XAxis type="number" dataKey="x" domain={[20, 100]} {...axisProps}
                    label={{ value: 'Qualidade da spec', position: 'insideBottom', offset: -6, fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" domain={[0, 100]} {...axisProps} />
                  <ZAxis range={[30, 30]} />
                  <RTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as (typeof corr)[number];
                      return (
                        <div className="max-w-[240px] rounded-lg border border-border bg-surface-2/95 px-3 py-2 text-xs shadow-xl">
                          <div className="num font-semibold">{d.key}</div>
                          <div className="text-muted">{d.title}</div>
                          <div className="num mt-1">Spec {d.x} · Aderência {d.y}%</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={corr} isAnimationActive={false}>
                    {corr.map((c) => <Cell key={c.key} fill={adhColor(c.y)} fillOpacity={0.75} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.2}>
          <ChartCard title="Qualidade da spec" description="Histórias por faixa de qualidade" className="h-full">
            <BucketChart data={specBuckets} unit="histórias" />
          </ChartCard>
        </FadeIn>
        <FadeIn delay={0.22}>
          <ChartCard title="Onde estão os critérios de aceite" description="Origem: campo do Jira, descrição, template não preenchido ou nenhum" className="h-full">
            <BucketChart data={criteriaSources} unit="histórias" />
          </ChartCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.25} className="mt-4">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
            <div className="mr-auto">
              <div className="text-sm font-semibold">Histórias</div>
              <div className="text-xs text-muted">{filtered.length} histórias · clique para abrir a auditoria</div>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input placeholder="Buscar por key ou título" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'Done', label: 'Concluída' },
                { value: 'In Progress', label: 'Em andamento' },
                { value: 'To Do', label: 'A fazer' },
              ]}
              className="w-[160px]"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="p-5"><EmptyState description="Nenhuma história encontrada com esses filtros." /></div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <thead>
                  <tr>
                    <Th>Key</Th>
                    <Th>Título</Th>
                    <Th>Squad</Th>
                    {sortTh('points', 'Pontos', 'text-right')}
                    {sortTh('prs', 'PRs', 'text-right')}
                    {sortTh('adherence', 'Aderência')}
                    <Th>Status</Th>
                    {sortTh('reopen', 'Reaberturas', 'text-right')}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.story.key} className="cursor-pointer hover:bg-accent-soft/50" onClick={() => setSelected(r)}>
                      <Td className="num text-xs font-semibold text-accent">{r.story.key}</Td>
                      <Td className="max-w-[340px] truncate text-text" title={r.story.title}>{r.story.title}</Td>
                      <Td><SquadTag id={r.story.squadId} /></Td>
                      <Td className="num text-right">{r.story.points}</Td>
                      <Td className="num text-right">{r.prs.length}</Td>
                      <Td>
                        {r.adherence === null ? (
                          <span className="text-xs text-muted">sem PR</span>
                        ) : (
                          <div className="flex w-36 items-center gap-2">
                            <Progress value={r.adherence} color={adhColor(r.adherence)} />
                            <span className="num w-9 text-right text-xs">{r.adherence}%</span>
                          </div>
                        )}
                      </Td>
                      <Td><Badge tone={statusTone[r.story.status]}>{statusLabel[r.story.status]}</Badge></Td>
                      <Td className={cn('num text-right', r.story.reopenCount >= 2 && 'font-semibold text-warn')}>{r.story.reopenCount}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </FadeIn>
      </>
      )}

      <AuditDialog row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
const critIcon: Record<CriterionStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="h-4 w-4 text-ok" />,
  partial: <AlertTriangle className="h-4 w-4 text-warn" />,
  missing: <XCircle className="h-4 w-4 text-risk" />,
};
const critLabel: Record<CriterionStatus, string> = { ok: 'Atendido', partial: 'Parcial', missing: 'Não encontrado no diff' };

export function AuditDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  // status consolidado por critério: o melhor resultado entre os PRs vinculados à história
  const rank: Record<CriterionStatus, number> = { missing: 0, partial: 1, ok: 2 };
  const n = row?.story.acceptanceCriteria.length ?? 0;
  const st: CriterionStatus[] = row
    ? Array.from({ length: n }, (_, i) =>
        row.prs.reduce<CriterionStatus>((best, p) => {
          const s = criterionStatuses(row.story.key, n, p.jiraAdherence ?? 0)[i];
          return rank[s] > rank[best] ? s : best;
        }, 'missing'),
      )
    : [];
  const notes = row
    ? Array.from(new Set(row.prs.flatMap((p) => p.adherenceNotes))).filter((note) => {
        const m = note.match(/^Critério (\d+)/);
        if (m) {
          const s = st[Number(m[1]) - 1];
          if (s === 'ok') return false;
          if (s === 'missing' && note.includes('parcialmente')) return false;
        }
        return !note.startsWith('Todos os critérios') || st.every((x) => x === 'ok');
      })
    : [];
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      {row && (
        <DialogContent
          className="max-w-3xl"
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="num text-accent">{row.story.key}</span> Auditoria da história
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-2">
              {row.story.title} · <SquadTag id={row.story.squadId} /> · {row.story.points} pts <AiSeal />
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface-2/60 p-3">
              <div className="text-[11px] text-muted">Aderência consolidada</div>
              <div className="num mt-1 text-2xl font-semibold" style={{ color: adhColor(row.adherence) }}>
                {row.adherence === null ? '—' : `${row.adherence}%`}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2/60 p-3">
              <div className="text-[11px] text-muted">Qualidade da spec</div>
              <div className="num mt-1 text-2xl font-semibold">{row.story.specQuality}<span className="text-sm text-muted">/100</span></div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2/60 p-3">
              <div className="text-[11px] text-muted">Reaberturas</div>
              <div className="num mt-1 text-2xl font-semibold">{row.story.reopenCount}</div>
            </div>
          </div>

          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Critérios de aceite</h4>
          <ul className="space-y-2">
            {row.story.acceptanceCriteria.map((c, i) => (
              <li
                key={c}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3',
                  row.adherence === null ? 'border-border' : st[i] === 'ok' ? 'border-ok/25 bg-ok/5' : st[i] === 'partial' ? 'border-warn/25 bg-warn/5' : 'border-risk/25 bg-risk/5',
                )}
              >
                <span className="mt-0.5">{row.adherence === null ? <span className="text-muted">•</span> : critIcon[st[i]]}</span>
                <div className="flex-1 text-sm">
                  <span className="num mr-1.5 text-muted">{i + 1}.</span>
                  {c}
                </div>
                {row.adherence !== null && <span className="whitespace-nowrap text-[11px] text-muted">{critLabel[st[i]]}</span>}
              </li>
            ))}
          </ul>

          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Notas da análise de IA</h4>
          {notes.length ? (
            <ul className="space-y-1.5 rounded-lg border border-ai/25 bg-ai-soft p-3 text-sm">
              {notes.map((n) => (
                <li key={n} className="flex gap-2"><span className="text-ai">›</span>{n}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum PR vinculado ainda.</p>
          )}

          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">PRs vinculados ({row.prs.length})</h4>
          <div className="space-y-2">
            {row.prs.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                <DevAvatar name={devById[p.authorId].name} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.title}</div>
                  <div className="num text-[11px] text-muted">
                    {p.repo} #{p.number} · {fmtInt(prSize(p))} linhas · revisão {fmtDuration(p.reviewTimeMin)} · aderência {p.jiraAdherence}%
                  </div>
                </div>
                <AiPctBar value={p.aiGeneratedPct} />
                <RiskBadge score={prRisk(p)} />
              </div>
            ))}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function BucketChart({ data, unit }: { data: { label: string; n: number; color: string }[]; unit: string }) {
  return (
    <div className="h-[230px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} interval={0} />
          <YAxis {...axisProps} allowDecimals={false} />
          <RTooltip content={<ChartTooltip format={(v) => `${v} ${unit}`} />} cursor={{ fill: 'var(--accent-soft)' }} />
          <Bar isAnimationActive={false} dataKey="n" name={unit} radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: 'var(--muted)', fontSize: 11 }}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
