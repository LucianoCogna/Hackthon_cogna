import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { milestones } from '@/mocks/milestones';
import { sprintById } from '@/mocks/sprints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MetricInfo } from './shared';
import { cn } from '@/lib/cn';

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--muted)', fontSize: 11 },
} as const;

export const gridProps = { stroke: 'var(--grid)', strokeDasharray: '0', vertical: false } as const;

// ---------------------------------------------------------------- Tooltip
type Fmt = (v: number, name: string) => string;
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: TooltipProps<number, string> & { format?: Fmt; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-lg border border-border bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined && <div className="mb-1.5 font-semibold text-text">{labelFormat ? labelFormat(String(label)) : label}</div>}
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={String(p.dataKey) + p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: (p.color ?? p.stroke) as string }} />
              {p.name}
            </span>
            <span className="num font-medium text-text">
              {format ? format(Number(p.value), String(p.name)) : String(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ChartCard
export function ChartCard({
  title,
  description,
  info,
  actions,
  children,
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  info?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn('card-glow flex flex-col', className)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-1.5">
            {title}
            {info && <MetricInfo>{info}</MetricInfo>}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className={cn('flex-1', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- Marcos (assinatura visual)
/** Linhas verticais tracejadas dos marcos Dev Hub e AI-DLC. Use dentro de um chart com XAxis dataKey="label" (S1..S14). */
export function milestoneLines(opts: { showLabel?: boolean } = {}) {
  const { showLabel = true } = opts;
  return milestones.map((m) => {
    const sp = sprintById[m.sprintId];
    return (
      <ReferenceLine
        key={m.id}
        x={`S${sp.index + 1}`}
        stroke={m.id === 'aidlc' ? 'var(--ai)' : 'var(--accent)'}
        strokeDasharray="4 4"
        strokeWidth={1.5}
        ifOverflow="extendDomain"
        label={
          showLabel
            ? {
                value: m.label,
                position: 'insideTopLeft',
                fill: m.id === 'aidlc' ? 'var(--ai)' : 'var(--accent)',
                fontSize: 11,
                fontWeight: 600,
                offset: 6,
              }
            : undefined
        }
      />
    );
  });
}

// ---------------------------------------------------------------- TrendChart
export type TrendSeries = { key: string; name: string; color: string; type?: 'line' | 'area'; dashed?: boolean };

export function TrendChart({
  data,
  series,
  height = 220,
  format,
  yFormat,
  scope,
  showMilestoneLabels = true,
  yDomain,
}: {
  data: Record<string, number | string>[];
  series: TrendSeries[];
  height?: number;
  format?: Fmt;
  yFormat?: (v: number) => string;
  scope?: [string, string];
  showMilestoneLabels?: boolean;
  yDomain?: [number | 'auto', number | 'auto'];
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...axisProps} tickFormatter={yFormat} width={48} domain={yDomain ?? ['auto', 'auto']} />
          {scope && scope[0] !== scope[1] && (
            <ReferenceArea x1={scope[0]} x2={scope[1]} fill="var(--accent)" fillOpacity={0.05} stroke="none" />
          )}
          {milestoneLines({ showLabel: showMilestoneLabels })}
          <RTooltip
            content={<ChartTooltip format={format} labelFormat={(l) => `Sprint ${l.slice(1)}`} />}
            cursor={{ stroke: 'var(--muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          {series.map((s) =>
            s.type === 'area' ? (
              <Area isAnimationActive={false}
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#g-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
               
              />
            ) : (
              <Line isAnimationActive={false}
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
               
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
