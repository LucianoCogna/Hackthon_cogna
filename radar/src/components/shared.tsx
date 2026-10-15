import { useEffect, useRef, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Info, Minus, SearchX, ShieldAlert, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/cn';
import { Card } from './ui/card';
import { Tooltip } from './ui/overlay';
import { Badge } from './ui/badge';
import { riskBand, riskLabel } from '@/lib/metrics';
import { hashString } from '@/mocks/seed';
import { squadById } from '@/mocks/squads';
import { fmtSigned } from '@/lib/format';

// ---------------------------------------------------------------- MetricInfo
export function MetricInfo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Tooltip content={children}>
      <button
        type="button"
        className={cn('inline-flex cursor-help text-muted/70 hover:text-accent', className)}
        aria-label="Como esta métrica é calculada"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}

// ---------------------------------------------------------------- AnimatedNumber
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        prev.current = v;
        setDisplay(v);
      },
    });
    // garante o valor final mesmo se o navegador estrangular os frames (aba em segundo plano, projetor)
    const t = setTimeout(() => {
      prev.current = value;
      setDisplay(value);
    }, 1000);
    return () => {
      controls.stop();
      clearTimeout(t);
    };
  }, [value]);
  return <span ref={ref}>{format(display)}</span>;
}

// ---------------------------------------------------------------- Sparkline
export function Sparkline({ data, color = 'var(--accent)', height = 36 }: { data: number[]; color?: string; height?: number }) {
  const id = useRef(`sp-${Math.random().toString(36).slice(2)}`).current;
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height }} className="w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={d} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------- Delta
export function Delta({ value, goodWhenUp = true, suffix = '%' }: { value: number | null; goodWhenUp?: boolean; suffix?: string }) {
  if (value === null || !isFinite(value)) return <span className="text-xs text-muted">sem período anterior</span>;
  const flat = Math.abs(value) < 0.5;
  const good = flat ? null : value > 0 === goodWhenUp;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'num inline-flex items-center gap-0.5 text-xs font-semibold',
        good === null ? 'text-muted' : good ? 'text-ok' : 'text-risk',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {fmtSigned(value, Math.abs(value) < 10 ? 1 : 0, suffix)}
    </span>
  );
}

// ---------------------------------------------------------------- KpiCard
export function KpiCard({
  label,
  value,
  format,
  delta,
  goodWhenUp = true,
  spark,
  sparkColor,
  info,
  icon,
  index = 0,
  footnote,
  tone,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta?: number | null;
  goodWhenUp?: boolean;
  spark?: number[];
  sparkColor?: string;
  info?: React.ReactNode;
  icon?: React.ReactNode;
  index?: number;
  footnote?: React.ReactNode;
  tone?: 'risk' | 'warn' | 'ai';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        className={cn(
          'card-glow relative h-full overflow-hidden p-4',
          tone === 'risk' && 'border-risk/40',
          tone === 'warn' && 'border-warn/40',
          tone === 'ai' && 'border-ai/30',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted">
            {icon && <span className="text-muted">{icon}</span>}
            <span className="truncate">{label}</span>
            {info && <MetricInfo>{info}</MetricInfo>}
          </div>
        </div>
        <div className="num mt-2 text-[26px] font-semibold leading-none tracking-tight text-text">
          <AnimatedNumber value={value} format={format} />
        </div>
        <div className="mt-2 flex min-h-4 items-center gap-2">
          {delta !== undefined && <Delta value={delta} goodWhenUp={goodWhenUp} />}
          {footnote && <span className="truncate text-[11px] text-muted">{footnote}</span>}
        </div>
        {spark && spark.length > 1 && (
          <div className="-mx-1 mt-2">
            <Sparkline data={spark} color={sparkColor} />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------- RiskBadge
export function RiskBadge({ score, showScore = true, className }: { score: number; showScore?: boolean; className?: string }) {
  const band = riskBand(score);
  const Icon = band === 'risk' ? ShieldAlert : band === 'warn' ? AlertTriangle : ShieldCheck;
  return (
    <Badge tone={band} className={className}>
      <Icon className="h-3 w-3" />
      {riskLabel[band]}
      {showScore && <span className="num opacity-80">· {score}</span>}
    </Badge>
  );
}

// ---------------------------------------------------------------- AiPctBar
export function AiPctBar({ value, className, showLabel = true }: { value: number; className?: string; showLabel?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-ai" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      {showLabel && <span className="num text-xs text-text">{Math.round(value)}%</span>}
    </div>
  );
}

// ---------------------------------------------------------------- DevAvatar
const avatarHues = [190, 260, 330, 25, 145, 210, 45, 290];
export function DevAvatar({ name, size = 28, className, me }: { name: string; size?: number; className?: string; me?: boolean }) {
  const h = avatarHues[hashString(name) % avatarHues.length];
  const initials = name === 'Você' ? 'VC' : name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', me && 'ring-2 ring-accent', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `hsl(${h} 70% 50% / 0.18)`,
        color: `hsl(${h} 80% 68%)`,
        border: `1px solid hsl(${h} 70% 55% / 0.35)`,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------- SquadTag
export function SquadTag({ id, className }: { id: string; className?: string }) {
  const s = squadById[id];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted', className)}>
      <span className="h-2 w-2 rounded-full" style={{ background: s?.color }} aria-hidden />
      {s?.name ?? id}
    </span>
  );
}

// ---------------------------------------------------------------- EmptyState
export function EmptyState({ title = 'Nada por aqui', description, action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-2">
          <SearchX className="h-5 w-5 text-accent" />
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------- PageHeader
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- AiSeal
export function AiSeal({ label = 'Analisado por IA' }: { label?: string }) {
  return (
    <Badge tone="ai">
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------- Stagger wrapper
export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------- Legend
export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.dashed ? (
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} />
          ) : (
            <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}
