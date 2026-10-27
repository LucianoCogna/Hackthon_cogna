import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Link2Off,
  XCircle,
  CircleDashed,
  ExternalLink,
  FileText,
  GitPullRequest,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  Rocket,
  Search,
  Sparkles,
} from 'lucide-react';
import { useScope } from '@/app/store';
import { AiPctBar, EmptyState, FadeIn, KpiCard, Legend, PageHeader, RiskBadge, SquadTag } from '@/components/shared';
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Progress, Select, Table, Td, Th } from '@/components/ui/misc';
import { Dialog, DialogContent, Tooltip } from '@/components/ui/overlay';
import { useGithubPrs, useJiraBoard, type GithubPr, type JiraStory } from '@/lib/jiraApi';
import { consolidatedStatuses, type CriterionStatus } from '../../shared/criteriaAudit';
import { ErrorState, LoadingState } from '@/components/ApiStates';
import { mean, prRisk, prSize, sum } from '@/lib/metrics';
import { fmtDate, fmtDuration, fmtInt, fmtNum, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';

const JIRA_SQUAD = 'pricing';

const catTone: Record<JiraStory['statusCategory'], Tone> = { Done: 'ok', 'In Progress': 'accent', 'To Do': 'neutral' };
const specColor = (v: number) => (v >= 80 ? 'var(--ok)' : v >= 60 ? 'var(--accent)' : v >= 40 ? 'var(--warn)' : 'var(--risk)');

type SortKey = 'sprint' | 'points' | 'spec' | 'reopen' | 'criteria' | 'prs' | 'adherence';

const adhColor = (v: number | null) =>
  v === null ? 'var(--muted)' : v >= 80 ? 'var(--ok)' : v >= 60 ? 'var(--warn)' : 'var(--risk)';
const storyAdherence = (prs: GithubPr[]) => {
  const v = prs.map((p) => p.jiraAdherence).filter((x): x is number => x !== null);
  return v.length ? Math.round(mean(v)) : null;
};

export default function GithubJiraLive({ switcher }: { switcher: React.ReactNode }) {
  const scope = useScope();
  const board = useJiraBoard(JIRA_SQUAD, 6);
  const [sprint, setSprint] = useState('all');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'sprint', dir: 'desc' });
  const [selected, setSelected] = useState<JiraStory | null>(null);

  const otherSquad = scope.filters.squadId !== 'all' && scope.filters.squadId !== JIRA_SQUAD;
  const data = board.status === 'ok' ? board.data : null;
  const gh = useGithubPrs(JIRA_SQUAD, 6);
  const allPrs = useMemo(() => (gh.status === 'ok' ? gh.data.prs : []), [gh.status, gh.data]);
  const prsByStory = useMemo(() => {
    const m = new Map<string, GithubPr[]>();
    for (const p of allPrs) if (p.jiraKey) m.set(p.jiraKey, [...(m.get(p.jiraKey) ?? []), p]);
    return m;
  }, [allPrs]);

  const stories = useMemo(() => {
    if (!data) return [];
    return sprint === 'all' ? data.stories : data.stories.filter((s) => String(s.sprintId) === sprint);
  }, [data, sprint]);

  const sprintsShown = useMemo(
    () => (!data ? [] : sprint === 'all' ? data.sprints : data.sprints.filter((s) => String(s.id) === sprint)),
    [data, sprint],
  );

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    const sprintOrder = new Map((data?.sprints ?? []).map((s, i) => [s.id, i]));
    const val = (s: JiraStory) =>
      sort.key === 'points' ? (s.points ?? -1)
      : sort.key === 'spec' ? s.specQuality
      : sort.key === 'reopen' ? s.reopenCount
      : sort.key === 'criteria' ? s.criteria.length
      : sort.key === 'prs' ? (prsByStory.get(s.key)?.length ?? 0)
      : sort.key === 'adherence' ? (storyAdherence(prsByStory.get(s.key) ?? []) ?? 101)
      : (sprintOrder.get(s.sprintId ?? -1) ?? -1);
    const d = sort.dir === 'asc' ? 1 : -1;
    return stories
      .filter((s) => status === 'all' || s.statusCategory === status)
      .filter((s) => !term || `${s.key} ${s.title} ${s.assignee ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => (val(a) - val(b)) * d || a.key.localeCompare(b.key, undefined, { numeric: true }));
  }, [stories, q, status, sort, data, prsByStory]);

  const k = {
    stories: stories.length,
    pointsDone: sum(sprintsShown.map((s) => s.pointsDone)),
    pointsCommitted: sum(sprintsShown.map((s) => s.pointsCommitted)),
    withCriteria: stories.length ? (100 * stories.filter((s) => s.criteria.length > 0).length) / stories.length : 0,
    templateUnfilled: stories.filter((s) => s.criteriaTemplateUnfilled).length,
    spec: mean(stories.map((s) => s.specQuality)),
    reopened: stories.filter((s) => s.reopenCount > 0).length,
    reopenTotal: sum(stories.map((s) => s.reopenCount)),
  };
  const prsInScope = allPrs.filter((p) => sprint === 'all' || p.sprintId === sprint);
  const linked = stories.map((s) => prsByStory.get(s.key) ?? []).filter((l) => l.length);
  const kp = {
    adherence: mean(prsInScope.map((p) => p.jiraAdherence).filter((v): v is number => v !== null)),
    prsPerStory: mean(linked.map((l) => l.length)),
    unlinked: prsInScope.length ? (100 * prsInScope.filter((p) => !p.jiraKey).length) / prsInScope.length : 0,
    prs: prsInScope.length,
  };

  const sprintChart = (data?.sprints ?? []).map((s) => ({
    label: s.name.replace(/^.*?(\d+)\s*$/, 'S$1'),
    full: s.name,
    Comprometidos: s.pointsCommitted,
    Entregues: s.pointsDone,
  }));
  const specBuckets = [
    { label: '0–39', n: stories.filter((s) => s.specQuality < 40).length, color: 'var(--risk)' },
    { label: '40–59', n: stories.filter((s) => s.specQuality >= 40 && s.specQuality < 60).length, color: 'var(--warn)' },
    { label: '60–79', n: stories.filter((s) => s.specQuality >= 60 && s.specQuality < 80).length, color: 'var(--accent)' },
    { label: '80–100', n: stories.filter((s) => s.specQuality >= 80).length, color: 'var(--ok)' },
  ];
  const criteriaSources = [
    { label: 'Campo', n: stories.filter((s) => s.criteriaSource === 'campo').length },
    { label: 'Descrição', n: stories.filter((s) => s.criteriaSource === 'descrição').length },
    { label: 'Template', n: stories.filter((s) => s.criteriaTemplateUnfilled).length },
    { label: 'Nenhum', n: stories.filter((s) => !s.criteriaSource && !s.criteriaTemplateUnfilled).length },
  ];

  const th = (key: SortKey, label: string, className?: string) => (
    <Th
      sortable
      active={sort.key === key}
      dir={sort.dir}
      className={className}
      onSort={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'spec' ? 'asc' : 'desc' }))}
    >
      {label}
    </Th>
  );

  return (
    <div>
      <PageHeader
        eyebrow="GitHub × Jira · dados reais"
        title="O código entregue bate com a história?"
        subtitle={
          data ? (
            <>
              Squad <b className="text-text">{data.squadName}</b> · quadro <span className="text-text">{data.boardName}</span> ·{' '}
              {data.sprints.length} sprints · atualizado às{' '}
              <span className="num">{new Date(data.generatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </>
          ) : (
            'Histórias, sprints e critérios de aceite direto do Jira.'
          )
        }
        actions={
          <>
            {switcher}
            <Tooltip content="Buscar de novo no Jira (o cache dura 5 minutos)">
              <Button variant="outline" size="icon" onClick={board.reload} disabled={board.status === 'loading'} aria-label="Atualizar">
                <RefreshCw className={cn('h-4 w-4', board.status === 'loading' && 'animate-spin')} />
              </Button>
            </Tooltip>
          </>
        }
      />

      {otherSquad && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-warn" />
          Por enquanto, só o squad <SquadTag id={JIRA_SQUAD} /> está ligado ao Jira. Mostrando Pricing.
        </div>
      )}

      {board.status === 'loading' && <LoadingState />}
      {board.status === 'error' && <ErrorState error={board.error} onRetry={board.reload} />}

      {data && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select
              label="Sprint"
              value={sprint}
              onChange={setSprint}
              options={[
                { value: 'all', label: `Todas as ${data.sprints.length} sprints` },
                ...[...data.sprints].reverse().map((s) => ({
                  value: String(s.id),
                  label: `${s.name}${s.state === 'active' ? ' (ativa)' : ''}`,
                })),
              ]}
              className="w-[260px]"
            />
            <Badge tone="ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Jira ao vivo
            </Badge>
            {data.criteriaField ? (
              <Badge tone="neutral">
                Critérios: campo <span className="num">"{data.criteriaField.name}"</span>
              </Badge>
            ) : (
              <Badge tone="warn">Campo de critérios não encontrado: lendo da descrição</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard index={0} icon={<FileText className="h-3.5 w-3.5" />} label="Histórias" value={k.stories} format={fmtInt}
              footnote={`${fmtInt(k.pointsCommitted)} pts comprometidos`} info="Itens do quadro (sem subtarefas e épicos) nas sprints selecionadas. Uma história com transbordo conta na sprint mais recente." />
            <KpiCard index={1} icon={<Rocket className="h-3.5 w-3.5" />} label="Pontos entregues" value={k.pointsDone} format={(v) => `${fmtInt(v)} pts`}
              footnote={k.pointsCommitted ? `${fmtPct((100 * k.pointsDone) / k.pointsCommitted)} do comprometido` : undefined}
              info="Story points de itens concluídos dentro do período de cada sprint." />
            <KpiCard index={2} icon={<ListChecks className="h-3.5 w-3.5" />} label="Com critérios de aceite" value={k.withCriteria} format={(v) => fmtPct(v)}
              tone={k.withCriteria < 60 ? 'warn' : undefined}
              footnote={k.templateUnfilled ? `${k.templateUnfilled} com template não preenchido` : undefined} info="Histórias com critérios no campo próprio do Jira ou numa seção 'Critérios de aceite' da descrição." />
            <KpiCard index={3} icon={<Sparkles className="h-3.5 w-3.5" />} label="Qualidade média da spec" value={k.spec} format={(v) => `${fmtInt(v)}/100`}
              info="Heurística sem LLM: quantidade de critérios (35), critérios testáveis em Dado/Quando/Então ou 'deve' (20), descrição com contexto (20), story points (15) e épico vinculado (10)." />
            <KpiCard index={4} icon={<RotateCcw className="h-3.5 w-3.5" />} label="Histórias reabertas" value={k.reopened} format={fmtInt}
              footnote={`${k.reopenTotal} idas e vindas`} info="Histórias que saíram de um status concluído e voltaram para o fluxo, segundo o histórico do Jira." />
            {gh.status === 'ok' && (
              <>
                <KpiCard index={5} icon={<GitPullRequest className="h-3.5 w-3.5" />} label="Aderência média PR × história" value={kp.adherence} format={(v) => fmtPct(v)}
                  tone={kp.adherence < 75 ? 'warn' : undefined} footnote="PRs simulados"
                  info="% dos critérios de aceite da história encontrados no diff de cada PR. Só PRs de histórias com critérios entram na média." />
                <KpiCard index={6} label="PRs por história" value={kp.prsPerStory} format={(v) => fmtNum(v, 1)} footnote={`${fmtInt(kp.prs)} PRs no período`}
                  info="Média de PRs vinculados a cada história que tem ao menos um PR." />
                <KpiCard index={7} icon={<Link2Off className="h-3.5 w-3.5" />} label="PRs sem história vinculada" value={kp.unlinked} format={(v) => fmtPct(v, 1)}
                  info="PRs sem chave do Jira (ex.: CRPR-123) no título, na branch ou na descrição." />
              </>
            )}
          </div>

          <FadeIn delay={0.05} className="mt-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/30 bg-warn/8 px-4 py-3 text-xs text-muted">
              <GitPullRequest className="h-4 w-4 shrink-0 text-warn" />
              <span>
                {gh.status === 'error' ? (
                  <>Não foi possível carregar os PRs: {gh.error.message}</>
                ) : (
                  <>
                    <b className="text-text">PRs simulados a partir destas histórias</b> enquanto o token do GitHub aguarda aprovação. Histórias, pontos e
                    critérios são reais; a aderência de cada PR é simulada sobre os critérios reais da história.
                  </>
                )}
              </span>
            </div>
          </FadeIn>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <FadeIn delay={0.1}>
              <ChartCard
                title="Pontos por sprint"
                description="Comprometidos × entregues"
                actions={<Legend items={[{ label: 'Comprometidos', color: 'var(--human)' }, { label: 'Entregues', color: 'var(--ok)' }]} />}
                className="h-full"
              >
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sprintChart} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={2}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis {...axisProps} allowDecimals={false} />
                      <RTooltip
                        content={<ChartTooltip format={(v) => `${fmtInt(v)} pts`} labelFormat={(l) => sprintChart.find((s) => s.label === l)?.full ?? l} />}
                        cursor={{ fill: 'var(--accent-soft)' }}
                      />
                      <Bar isAnimationActive={false} dataKey="Comprometidos" fill="var(--human)" radius={[4, 4, 0, 0]} />
                      <Bar isAnimationActive={false} dataKey="Entregues" fill="var(--ok)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </FadeIn>
            <FadeIn delay={0.15}>
              <ChartCard title="Qualidade da spec" description="Histórias por faixa (heurística)" className="h-full">
                <BucketChart data={specBuckets} unit="histórias" />
              </ChartCard>
            </FadeIn>
            <FadeIn delay={0.2}>
              <ChartCard title="Onde estão os critérios de aceite" description="Origem: campo do Jira, descrição, template não preenchido ou nenhum" className="h-full">
                <BucketChart data={criteriaSources.map((c, i) => ({ ...c, color: i >= 2 ? 'var(--warn)' : 'var(--accent)' }))} unit="histórias" />
              </ChartCard>
            </FadeIn>
          </div>

          <FadeIn delay={0.25} className="mt-4">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                <div className="mr-auto">
                  <div className="text-sm font-semibold">Histórias do Jira</div>
                  <div className="text-xs text-muted">{rows.length} itens · clique para ver os critérios</div>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <Input placeholder="Buscar por key, título ou pessoa" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
                </div>
                <Select
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'all', label: 'Todos os status' },
                    { value: 'Done', label: 'Concluídas' },
                    { value: 'In Progress', label: 'Em andamento' },
                    { value: 'To Do', label: 'A fazer' },
                  ]}
                  className="w-[170px]"
                />
              </div>
              {rows.length === 0 ? (
                <div className="p-5">
                  <EmptyState description="Nenhuma história encontrada com esses filtros." />
                </div>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Key</Th>
                        <Th>Título</Th>
                        <Th>Responsável</Th>
                        {th('sprint', 'Sprint')}
                        {th('points', 'Pontos', 'text-right')}
                        {th('prs', 'PRs', 'text-right')}
                        {th('adherence', 'Aderência')}
                        {th('criteria', 'Critérios', 'text-right')}
                        {th('spec', 'Spec')}
                        <Th>Status</Th>
                        {th('reopen', 'Reaberturas', 'text-right')}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.key} className="cursor-pointer hover:bg-accent-soft/50" onClick={() => setSelected(s)}>
                          <Td>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="num inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                            >
                              {s.key} <ExternalLink className="h-3 w-3" />
                            </a>
                          </Td>
                          <Td className="max-w-[240px] truncate text-text" title={s.title}>
                            {s.title}
                            <div className="text-[11px] text-muted">{s.type}</div>
                          </Td>
                          <Td className="max-w-[150px] truncate text-xs text-muted" title={s.assignee ?? undefined}>{s.assignee ?? '—'}</Td>
                          <Td className="text-xs text-muted">{s.sprintName ?? '—'}</Td>
                          <Td className="num text-right">{s.points ?? '—'}</Td>
                          <Td className="num text-right">{prsByStory.get(s.key)?.length ?? 0}</Td>
                          <Td>
                            <AdherenceCell value={storyAdherence(prsByStory.get(s.key) ?? [])} />
                          </Td>
                          <Td className={cn('num text-right', s.criteria.length === 0 && 'text-warn')}>
                            {s.criteriaTemplateUnfilled ? <Badge tone="warn">template vazio</Badge> : s.criteria.length}
                          </Td>
                          <Td>
                            <div className="flex w-20 items-center gap-2">
                              <Progress value={s.specQuality} color={specColor(s.specQuality)} />
                              <span className="num w-7 text-right text-xs">{s.specQuality}</span>
                            </div>
                          </Td>
                          <Td>
                            <Badge tone={catTone[s.statusCategory]}>{s.status}</Badge>
                          </Td>
                          <Td className={cn('num text-right', s.reopenCount >= 2 && 'font-semibold text-warn')}>{s.reopenCount}</Td>
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

      <StoryDialog story={selected} prs={selected ? (prsByStory.get(selected.key) ?? []) : []} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
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

function AdherenceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">—</span>;
  return (
    <div className="flex w-24 items-center gap-2">
      <Progress value={value} color={adhColor(value)} />
      <span className="num w-8 text-right text-xs">{value}%</span>
    </div>
  );
}

const critIcon: Record<CriterionStatus, React.ReactNode> = {
  ok: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />,
  partial: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />,
  missing: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-risk" />,
};
const critLabel: Record<CriterionStatus, string> = { ok: 'Atendido', partial: 'Parcial', missing: 'Não encontrado no diff' };
const critBox: Record<CriterionStatus, string> = {
  ok: 'border-ok/25 bg-ok/5',
  partial: 'border-warn/25 bg-warn/5',
  missing: 'border-risk/25 bg-risk/5',
};

function StoryDialog({ story, prs, onClose }: { story: JiraStory | null; prs: GithubPr[]; onClose: () => void }) {
  const adherences = prs.map((p) => p.jiraAdherence).filter((v): v is number => v !== null);
  const statuses = story && adherences.length ? consolidatedStatuses(story.key, story.criteria.length, adherences) : null;
  // notas coerentes com o status consolidado da história
  const notes = [...new Set(prs.flatMap((p) => p.adherenceNotes))].filter((n) => {
    const m = n.match(/^Critério (\d+)/);
    if (!m) return !n.startsWith('Todos os critérios') || (statuses?.every((x) => x === 'ok') ?? false);
    if (!statuses) return false;
    const st = statuses[Number(m[1]) - 1];
    return st === 'missing' ? !n.includes('parcialmente') : st === 'partial';
  });
  const adh = storyAdherence(prs);
  return (
    <Dialog open={!!story} onOpenChange={(o) => !o && onClose()}>
      {story && (
        <DialogContent
          className="max-w-3xl"
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="num text-accent">{story.key}</span> {story.title}
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-2">
              {story.type} · {story.sprintName ?? 'sem sprint'} · {story.points ?? '—'} pts · {story.assignee ?? 'sem responsável'}
              <Badge tone={catTone[story.statusCategory]}>{story.status}</Badge>
            </span>
          }
          footer={
            <a
              href={story.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-strong"
            >
              <ExternalLink className="h-4 w-4" /> Abrir no Jira
            </a>
          }
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Qualidade da spec (heurística)" value={`${story.specQuality}/100`} color={specColor(story.specQuality)} />
            <Stat label="Aderência PR × história" value={adh === null ? '—' : `${adh}%`} color={adh === null ? undefined : adhColor(adh)} />
            <Stat label="Reaberturas" value={String(story.reopenCount)} />
            <Stat label="Criada · concluída" value={`${fmtDate(story.created)} · ${story.resolved ? fmtDate(story.resolved) : '—'}`} small />
          </div>
          {story.epicKey && (
            <p className="mt-3 text-xs text-muted">
              Épico: <span className="num text-text">{story.epicKey}</span> {story.epicName && `· ${story.epicName}`}
            </p>
          )}

          <h4 className="mb-2 mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Critérios de aceite
            {story.criteriaSource && <Badge tone="neutral">{story.criteriaSource === 'campo' ? 'campo do Jira' : 'da descrição'}</Badge>}
          </h4>
          {story.criteria.length ? (
            <ul className="space-y-2">
              {story.criteria.map((c, i) => (
                <li key={i} className={cn('flex items-start gap-3 rounded-lg border p-3 text-sm', statuses ? critBox[statuses[i]] : 'border-border')}>
                  {statuses ? critIcon[statuses[i]] : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
                  <span className="flex-1">
                    <span className="num mr-1.5 text-muted">{i + 1}.</span>
                    {c}
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-muted">{statuses ? critLabel[statuses[i]] : 'sem PRs'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
              {story.criteriaTemplateUnfilled
                ? 'A descrição tem o template de critérios de aceite, mas ele não foi preenchido. Sem critérios, não dá para auditar se o código entregue bate com o card.'
                : 'Esta história não tem critérios de aceite no Jira. Sem eles, não dá para auditar se o código entregue bate com o card.'}
            </div>
          )}
          {notes.length > 0 && (
            <>
              <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Notas da análise</h4>
              <ul className="space-y-1.5 rounded-lg border border-ai/25 bg-ai-soft p-3 text-sm">
                {notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="text-ai">›</span>
                    {n}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">PRs vinculados ({prs.length})</h4>
          {prs.length ? (
            <div className="space-y-2">
              {prs.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="num text-[11px] text-muted">
                      {p.repo} #{p.number} · {fmtInt(prSize(p))} linhas · revisão {fmtDuration(p.reviewTimeMin)}
                      {p.jiraAdherence !== null && ` · aderência ${p.jiraAdherence}%`} · {p.mergedAt ? 'mergeado' : 'aberto'}
                    </div>
                  </div>
                  <AiPctBar value={p.aiGeneratedPct} />
                  <RiskBadge score={prRisk(p)} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhum PR vinculado a esta história.</p>
          )}
          <p className="mt-4 text-[11px] text-muted">PRs simulados a partir da história enquanto o token do GitHub aguarda aprovação.</p>
        </DialogContent>
      )}
    </Dialog>
  );
}

function Stat({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cn('num mt-1 font-semibold', small ? 'text-sm' : 'text-2xl')} style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
