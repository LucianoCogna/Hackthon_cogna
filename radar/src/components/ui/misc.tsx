import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------- Progress
export function Progress({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? 'var(--accent)' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...p}
    />
  ),
);
Input.displayName = 'Input';

// ---------------------------------------------------------------- Select (nativo estilizado)
export type Option = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  className,
  label,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
  label?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        'relative inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface pl-3 pr-8 text-sm hover:border-accent/50 focus-within:border-accent/60',
        className,
      )}
    >
      {icon && <span className="text-muted">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent font-medium text-text outline-none [&>option]:bg-surface"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" />
    </label>
  );
}

// ---------------------------------------------------------------- Tabs (segmented)
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('inline-flex max-w-full overflow-x-auto rounded-lg border border-border bg-surface-2 p-0.5', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'shrink-0 cursor-pointer whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === it.value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Accordion simples
export function Accordion({
  title,
  children,
  defaultOpen = false,
  icon,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-semibold"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-border px-5 py-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Table
export function Table({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...p} />
    </div>
  );
}
export function Th({
  className,
  sortable,
  active,
  dir,
  onSort,
  children,
  ...p
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  sortable?: boolean;
  active?: boolean;
  dir?: 'asc' | 'desc';
  onSort?: () => void;
}) {
  return (
    <th
      className={cn(
        'sticky top-0 whitespace-nowrap border-b border-border bg-surface px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted',
        sortable && 'cursor-pointer select-none hover:text-text',
        active && 'text-accent',
        className,
      )}
      onClick={sortable ? onSort : undefined}
      {...p}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && active && <span className="text-[9px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </span>
    </th>
  );
}
export function Td({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('whitespace-nowrap border-b border-border/60 px-3 py-2.5', className)} {...p} />;
}
