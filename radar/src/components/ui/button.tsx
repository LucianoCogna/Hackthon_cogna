import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost' | 'subtle';
type Size = 'sm' | 'md' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-sm hover:bg-accent/90',
  outline: 'border border-border bg-surface text-text hover:bg-surface-2',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface-2',
  subtle: 'bg-surface-2 text-text hover:bg-surface-2/70',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  icon: 'h-9 w-9',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'outline', size = 'md', ...p }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...p}
    />
  ),
);
Button.displayName = 'Button';
