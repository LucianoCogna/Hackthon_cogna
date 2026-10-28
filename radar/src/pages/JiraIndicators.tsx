// Indicadores de entrega direto do Jira (inspirados no painel de Indicadores do DPOS Hub),
// enxutos: 4 KPIs, burndown real da sprint, comprometido × entregue, pontuação por dev e por tipo.
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarClock, CheckCheck, Rocket, Undo2 } from 'lucide-react';
import { DevAvatar, EmptyState, FadeIn, KpiCard, Legend } from '@/components/shared';
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { Table, Td, Th } from '@/components/ui/misc';
import type { JiraBoardResponse, JiraSprint, JiraSprintItem } from '@/lib/jiraApi';
import { mean, sum } from '@/lib/metrics';
import { fmtInt, fmtPct, shortSprint } from '@/lib/format';
import { cn } from '@/lib/cn';

const DAY = 86_400_000;

/** hoje no fuso do navegador (AAAA-MM-DD) */
const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const rateTone = (v: number) => (v >= 90 ? 'text-ok' : v >= 75 ? 'text-warn' : 'text-risk');

/** Itens que contam pontos da sprint: sem cancelados e sem subtarefas (que não têm pontos). */
const pointItems = (s: JiraSprint) => s.items.filter((i) => !i.cancelled && !i.subtask);

type Stat = { committed: number; done: number; items: number; spilled: number };

function sprintStat(s: JiraSprint): Stat {
  const it = pointItems(s);
  return {
    committed: sum(it.map((i) => i.points)),
    done: sum(it.filter((i) => i.doneAt).map((i) => i.points)),
    items: it.length,
    spilled: it.filter((i) => !i.doneAt).length,
  };
}

function history(sprints: JiraSprint[]) {
  const closed = sprints.filter((s) => s.state === 'closed').map(sprintStat);
  const committed = sum(closed.map((c) => c.committed));
  const items = sum(closed.map((c) => c.items));
  return {
    closed,
    avgDone: mean(closed.map((c) => c.done)),
    completion: committed ? (100 * sum(closed.map((c) => c.done))) / committed : 0,
    spill: items ? (100 * sum(closed.map((c) => c.spilled))) / items : 0,
  };
}

/** Dias úteis entre o início e o fim da sprint, com os pontos restantes ao fim de cada dia. */
function burndown(s: JiraSprint) {
  if (!s.start || !s.end) return [];
  const it = pointItems(s);
  const total = sum(it.map((i) => i.points));
  const days: string[] = [];
  for (let t = Date.parse(s.start + 'T12:00:00Z'); t <= Date.parse(s.end + 'T12:00:00Z'); t += DAY) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(new Date(t).toISOString().slice(0, 10));
  }
  const today = localToday();
  return days.map((d, i) => ({
    day: d,
    label: ddmm(d),
    Ideal: +(total * (1 - i / Math.max(1, days.length - 1))).toFixed(1),
    Restante: s.state === 'active' && d > today ? null : total - sum(it.filter((x) => x.doneAt && x.doneAt <= d).map((x) => x.points)),
  }));
}

/** Pontos por responsável: comprometidos × entregues, mais as subtarefas concluídas. */
function byDev(items: JiraSprintItem[]) {
  const m = new Map<string, { name: string; committed: number; done: number; items: number; subtasks: number }>();
  for (const i of items) {
    if (i.cancelled) continue;
    const name = i.assignee ?? 'Sem responsável';
    const r = m.get(name) ?? { name, committed: 0, done: 0, items: 0, subtasks: 0 };
    if (i.subtask) {
      if (i.doneAt) r.subtasks++;
    } else {
      r.committed += i.points;
      r.items++;
      if (i.doneAt) r.done += i.points;
    }
    m.set(name, r);
  }
  return [...m.values()]
    .filter((r) => r.items || r.subtasks)
    .sort((a, b) => b.done - a.done || b.committed - a.committed || b.subtasks - a.subtasks);
}

/** Itens, concluídos e pontos por tipo de item do Jira (História, Subtarefa, Enabler…). */
function byType(items: JiraSprintItem[]) {
  const m = new Map<string, { type: string; subtask: boolean; items: number; done: number; points: number }>();
  for (const i of items) {
    if (i.cancelled) continue;
    const r = m.get(i.type) ?? { type: i.type, subtask: i.subtask, items: 0, done: 0, points: 0 };
    r.items++;
    if (i.doneAt) r.done++;
    r.points += i.points;
    m.set(i.type, r);
  }
  // tipos com pontos primeiro (por pontos), subtarefas no fim
  return [...m.values()].sort((a, b) => Number(a.subtask) - Number(b.subtask) || b.points - a.points || b.items - a.items);
}

export function JiraIndicators({ data, sprintId }: { data: JiraBoardResponse; sprintId: string }) {
  const h = useMemo(() => history(data.sprints), [data]);
  const focus =
    (sprintId !== 'all' && data.sprints.find((s) => String(s.id) === sprintId)) ||
    data.sprints.find((s) => s.state === 'active') ||
    data.sprints[data.sprints.length - 1];
  const fs = sprintStat(focus);
  const burn = useMemo(() => burndown(focus), [focus]);
  const today = localToday();
  const dayIdx = burn.findIndex((b) => b.day >= today);

  // pontuação por dev e por tipo: na sprint escolhida, ou em todas as sprints da janela
  const scoped = sprintId === 'all' ? data.sprints : data.sprints.filter((s) => String(s.id) === sprintId);
  const scopeLabel = sprintId === 'all' ? `${scoped.length} sprints` : `Sprint ${shortSprint(scoped[0]?.name ?? '')}`;
  const scopedItems = useMemo(() => scoped.flatMap((s) => s.items), [scoped]);
  const devs = useMemo(() => byDev(scopedItems), [scopedItems]);
  const types = useMemo(() => byType(scopedItems), [scopedItems]);
  const maxDev = Math.max(1, ...devs.map((d) => d.committed));

  const bars = data.sprints.map((s) => {
    const st = sprintStat(s);
    return {
      label: shortSprint(s.name),
      full: `${s.name}${s.state === 'active' ? ' (ativa)' : ''}`,
      Comprometidos: st.committed,
      Entregues: st.done,
      pct: st.committed ? Math.round((100 * st.done) / st.committed) : 0,
    };
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard index={0} icon={<Rocket className="h-3.5 w-3.5" />} label="Entrega média" value={h.avgDone} format={(v) => `${fmtInt(v)} pts`}
          spark={h.closed.map((c) => c.done)} sparkColor="var(--ok)" footnote={`por sprint · ${h.closed.length} fechadas`}
          info="Story points concluídos dentro do período da sprint, em média nas sprints fechadas." />
        <KpiCard index={1} icon={<CheckCheck className="h-3.5 w-3.5" />} label="Taxa de conclusão" value={h.completion} format={(v) => fmtPct(v)}
          tone={h.completion < 75 ? 'risk' : h.completion < 90 ? 'warn' : undefined}
          spark={h.closed.map((c) => (c.committed ? (100 * c.done) / c.committed : 0))} footnote="pontos entregues ÷ comprometidos"
          info="Soma dos pontos entregues ÷ soma dos pontos comprometidos nas sprints fechadas. Verde a partir de 90%." />
        <KpiCard index={2} icon={<Undo2 className="h-3.5 w-3.5" />} label="Transbordo" value={h.spill} format={(v) => fmtPct(v)} goodWhenUp={false}
          tone={h.spill > 25 ? 'warn' : undefined} spark={h.closed.map((c) => (c.items ? (100 * c.spilled) / c.items : 0))} sparkColor="var(--warn)"
          footnote="dos itens não fecharam na sprint" info="% dos itens comprometidos (sem subtarefas) que não foram concluídos dentro da sprint. Cancelados ficam de fora." />
        <KpiCard index={3} icon={<CalendarClock className="h-3.5 w-3.5" />} label={`Sprint ${shortSprint(focus.name)}${focus.state === 'active' ? ' · ativa' : ''}`}
          value={fs.committed ? (100 * fs.done) / fs.committed : 0} format={(v) => fmtPct(v)}
          footnote={`${fmtInt(fs.done)} de ${fmtInt(fs.committed)} pts · ${fs.items} itens`}
          info="Pontos já concluídos na sprint em foco. Escolha outra sprint no seletor acima." />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <FadeIn delay={0.1} className="lg:col-span-3">
          <ChartCard
            title={`Burndown · Sprint ${shortSprint(focus.name)}`}
            description={`Pontos restantes por dia útil${focus.start && focus.end ? ` · ${ddmm(focus.start)} → ${ddmm(focus.end)}` : ''}. Usa a data real de conclusão de cada item.`}
            actions={<Legend items={[{ label: 'Ideal', color: 'var(--muted)', dashed: true }, { label: 'Restante', color: 'var(--accent)' }]} />}
            className="h-full"
          >
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burn} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <RTooltip content={<ChartTooltip format={(v) => `${fmtInt(v)} pts`} />} />
                  {focus.state === 'active' && dayIdx >= 0 && (
                    <ReferenceLine x={burn[dayIdx].label} stroke="var(--brand-yellow)" strokeDasharray="3 3"
                      label={{ value: 'hoje', position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 10 }} />
                  )}
                  <Line isAnimationActive={false} dataKey="Ideal" stroke="var(--muted)" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
                  <Line isAnimationActive={false} dataKey="Restante" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>

        <FadeIn delay={0.15} className="lg:col-span-2">
          <ChartCard
            title="Comprometido × entregue"
            description="Pontos por sprint"
            actions={<Legend items={[{ label: 'Comprometidos', color: 'var(--human)' }, { label: 'Entregues', color: 'var(--ok)' }]} />}
            className="h-full"
          >
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={2}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <RTooltip
                    content={
                      <ChartTooltip
                        format={(v) => `${fmtInt(v)} pts`}
                        labelFormat={(l) => {
                          const b = bars.find((x) => x.label === l);
                          return b ? `${b.full} · ${b.pct}% concluído` : l;
                        }}
                      />
                    }
                    cursor={{ fill: 'var(--accent-soft)' }}
                  />
                  <Bar isAnimationActive={false} dataKey="Comprometidos" fill="var(--human)" radius={[4, 4, 0, 0]} />
                  <Bar isAnimationActive={false} dataKey="Entregues" fill="var(--ok)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </FadeIn>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <FadeIn delay={0.2} className="lg:col-span-3">
          <ChartCard
            title="Pontuação por dev"
            description={`Pontos entregues sobre os comprometidos · ${scopeLabel}`}
            info="Pontos de histórias, enablers, spikes etc. atribuídos à pessoa. Subtarefas não têm pontos no Jira e aparecem só como contagem de concluídas."
            actions={<Legend items={[{ label: 'Entregues', color: 'var(--ok)' }, { label: 'Comprometidos', color: 'var(--human)' }]} />}
            className="h-full"
          >
            {devs.length === 0 ? (
              <EmptyState description="Nenhum item atribuído neste período." />
            ) : (
              <div className="space-y-1">
                {devs.map((d) => (
                  <div key={d.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <DevAvatar name={d.name} size={26} />
                    <div className="w-40 min-w-0 truncate text-sm sm:w-48">{d.name}</div>
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(100 * d.committed) / maxDev}%`, background: 'var(--human)', opacity: 0.45 }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-ok" style={{ width: `${(100 * d.done) / maxDev}%` }} />
                    </div>
                    <span className="num w-20 text-right text-sm">
                      <b>{fmtInt(d.done)}</b>
                      <span className="text-muted"> / {fmtInt(d.committed)}</span>
                    </span>
                    <span className="num hidden w-16 text-right text-xs text-muted sm:inline" title="Subtarefas concluídas">
                      {d.subtasks} sub
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </FadeIn>

        <FadeIn delay={0.25} className="lg:col-span-2">
          <ChartCard
            title="Por tipo de item"
            description={`Itens, concluídos e pontos · ${scopeLabel}`}
            info="Tipos do Jira. Subtarefas não carregam pontos: os pontos ficam na história. Um item que passou por mais de uma sprint conta em cada uma."
            className="h-full"
          >
            {types.length === 0 ? (
              <EmptyState description="Nenhum item neste período." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Tipo</Th>
                    <Th className="text-right">Itens</Th>
                    <Th className="text-right">Concluídos</Th>
                    <Th className="text-right">Pontos</Th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => {
                    const pct = t.items ? (100 * t.done) / t.items : 0;
                    return (
                      <tr key={t.type} className="hover:bg-surface-2/50">
                        <Td className="text-text">
                          {t.type}
                          {t.subtask && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">subtarefa</span>}
                        </Td>
                        <Td className="num text-right">{fmtInt(t.items)}</Td>
                        <Td className="num text-right">
                          {fmtInt(t.done)} <span className={cn('text-xs', rateTone(pct))}>({fmtPct(pct)})</span>
                        </Td>
                        <Td className="num text-right text-muted">{t.subtask ? '—' : fmtInt(t.points)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </ChartCard>
        </FadeIn>
      </div>
    </div>
  );
}
