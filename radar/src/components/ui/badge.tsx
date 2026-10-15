import * as React from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'ok' | 'warn' | 'risk' | 'ai' | 'accent';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  ok: 'bg-ok/12 text-ok border-ok/30',
  warn: 'bg-warn/12 text-warn border-warn/30',
  risk: 'bg-risk/12 text-risk border-risk/30',
  ai: 'bg-ai-soft text-ai border-ai/30',
  accent: 'bg-accent-soft text-accent border-accent/30',
};

export function Badge({ tone = 'neutral', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4',
        tones[tone],
        className,
      )}
      {...p}
    />
  );
}
