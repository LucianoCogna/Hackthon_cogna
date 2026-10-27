import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
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
import { EmptyState, FadeIn, KpiCard, Legend, PageHeader, SquadTag } from '@/components/shared';
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Progress, Select, Table, Td, Th } from '@/components/ui/misc';
import { Dialog, DialogContent, Tooltip } from '@/components/ui/overlay';
import { useJiraBoard, type JiraStory } from '@/lib/jiraApi';
import { mean, sum } from '@/lib/metrics';
import { fmtDate, fmtInt, fmtPct } from '@/lib/format';
import { cn } from '@/lib/cn';

const JIRA_SQUAD = 'pricing';

const catTone: Record<JiraStory['statusCategory'], Tone> = { Done: 'ok', 'In Progress': 'accent', 'To Do': 'neutral' };
const specColor = (v: number) => (v >= 80 ? 'var(--ok)' : v >= 60 ? 'var(--accent)' : v >= 40 ? 'var(--warn)' : 'var(--risk)');

type SortKey = 'sprint' | 'points' | 'spec' | 'reopen' | 'criteria';

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
      : (sprintOrder.get(s.sprintId ?? -1) ?? -1);
    const d = sort.dir === 'asc' ? 1 : -1;
    return stories
      .filter((s) => status === 'all' || s.statusCategory === status)
      .filter((s) => !term || `${s.key} ${s.title} ${s.assignee ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => (val(a) - val(b)) * d || a.key.localeCompare(b.key, undefined, { numeric: true }));
  }, [stories, q, status, sort, data]);

  const k = {
    stories: stories.length,
    pointsDone: sum(sprintsShown.map((s) => s.pointsDone)),
    pointsCommitted: sum(sprintsShown.map((s) => s.pointsCommitted)),
    withCriteria: stories.length ? (100 * stories.filter((s) => s.criteria.length > 0).length) / stories.length : 0,
    spec: mean(stories.map((s) => s.specQuality)),
    reopened: stories.filter((s) => s.reopenCount > 0).length,
    reopenTotal: sum(stories.map((s) => s.reopenCount)),
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
    { label: 'Campo do Jira', n: stories.filter((s) => s.criteriaSource === 'campo').length },
    { label: 'Na descrição', n: stories.filter((s) => s.criteriaSource === 'descrição').length },
    { label: 'Sem critérios', n: stories.filter((s) => !s.criteriaSource).length },
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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <KpiCard index={0} icon={<FileText className="h-3.5 w-3.5" />} label="Histórias" value={k.stories} format={fmtInt}
              footnote={`${fmtInt(k.pointsCommitted)} pts comprometidos`} info="Itens do quadro (sem subtarefas e épicos) nas sprints selecionadas. Uma história com transbordo conta na sprint mais recente." />
            <KpiCard index={1} icon={<Rocket className="h-3.5 w-3.5" />} label="Pontos entregues" value={k.pointsDone} format={(v) => `${fmtInt(v)} pts`}
              footnote={k.pointsCommitted ? `${fmtPct((100 * k.pointsDone) / k.pointsCommitted)} do comprometido` : undefined}
              info="Story points de itens concluídos dentro do período de cada sprint." />
            <KpiCard index={2} icon={<ListChecks className="h-3.5 w-3.5" />} label="Com critérios de aceite" value={k.withCriteria} format={(v) => fmtPct(v)}
              tone={k.withCriteria < 60 ? 'warn' : undefined} info="Histórias com critérios no campo próprio do Jira ou numa seção 'Critérios de aceite' da descrição." />
            <KpiCard index={3} icon={<Sparkles className="h-3.5 w-3.5" />} label="Qualidade média da spec" value={k.spec} format={(v) => `${fmtInt(v)}/100`}
              info="Heurística sem LLM: quantidade de critérios (35), critérios testáveis em Dado/Quando/Então ou 'deve' (20), descrição com contexto (20), story points (15) e épico vinculado (10)." />
            <KpiCard index={4} icon={<RotateCcw className="h-3.5 w-3.5" />} label="Histórias reabertas" value={k.reopened} format={fmtInt}
              footnote={`${k.reopenTotal} idas e vindas`} info="Histórias que saíram de um status concluído e voltaram para o fluxo, segundo o histórico do Jira." />
          </div>

          <FadeIn delay={0.05} className="mt-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-xs text-muted">
              <GitPullRequest className="h-4 w-4 text-accent" />
              <span>
                <b className="text-text">Próxima etapa: integração com o GitHub.</b> Aderência PR × história, PRs por história e % de PRs sem
                história dependem dos PRs vinculados aos cards.
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
              <ChartCard title="Onde estão os critérios de aceite" description="Origem dos critérios em cada história" className="h-full">
                <BucketChart data={criteriaSources.map((c, i) => ({ ...c, color: i === 2 ? 'var(--warn)' : 'var(--accent)' }))} unit="histórias" />
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
                          <Td className="max-w-[320px] truncate text-text" title={s.title}>
                            {s.title}
                            <div className="text-[11px] text-muted">{s.type}</div>
                          </Td>
                          <Td className="text-xs text-muted">{s.assignee ?? '—'}</Td>
                          <Td className="text-xs text-muted">{s.sprintName ?? '—'}</Td>
                          <Td className="num text-right">{s.points ?? '—'}</Td>
                          <Td className={cn('num text-right', s.criteria.length === 0 && 'text-warn')}>{s.criteria.length}</Td>
                          <Td>
                            <div className="flex w-28 items-center gap-2">
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

      <StoryDialog story={selected} onClose={() => setSelected(null)} />
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

function LoadingState() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-accent" /> Buscando histórias e sprints no Jira…
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="mt-4 h-[300px] animate-pulse rounded-xl border border-border bg-surface" />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: { message: string; code: number }; onRetry: () => void }) {
  const hint =
    error.code === 401
      ? 'O Jira recusou o e-mail + API token. Gere um novo token em id.atlassian.com → Segurança → Tokens de API e atualize JIRA_USERNAME e JIRA_TOKEN no radar/.env.local (dev) e nas variáveis do projeto na Vercel.'
      : error.code === 403
        ? 'O usuário do token não tem acesso a esse quadro no Jira.'
        : error.code === 0
          ? 'A API não respondeu. No ambiente local, rode com npm run dev.'
          : 'Tente de novo em instantes. Se persistir, veja os logs da função na Vercel.';
  return (
    <Card className="border-risk/30 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Não foi possível carregar os dados do Jira</div>
          <p className="num mt-1 text-xs text-risk">{error.message}</p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">{hint}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StoryDialog({ story, onClose }: { story: JiraStory | null; onClose: () => void }) {
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Qualidade da spec (heurística)" value={`${story.specQuality}/100`} color={specColor(story.specQuality)} />
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
                <li key={i} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <span className="flex-1">
                    <span className="num mr-1.5 text-muted">{i + 1}.</span>
                    {c}
                  </span>
                  <span className="whitespace-nowrap text-[11px] text-muted">aguardando PRs</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
              Esta história não tem critérios de aceite no Jira. Sem eles, não dá para auditar se o código entregue bate com o card.
            </div>
          )}
          <p className="mt-4 text-[11px] text-muted">
            A auditoria critério a critério (atendido / parcial / não encontrado) entra quando os PRs do GitHub forem vinculados a esta história.
          </p>
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
