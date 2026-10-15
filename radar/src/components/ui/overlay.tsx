import * as D from '@radix-ui/react-dialog';
import * as T from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------- Tooltip
export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  return (
    <T.Root delayDuration={150}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[100] max-w-xs rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs leading-relaxed text-text shadow-xl',
            className,
          )}
        >
          {content}
          <T.Arrow className="fill-[var(--surface-2)]" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

// ---------------------------------------------------------------- Dialog
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  children,
  className,
  title,
  description,
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <D.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <D.Title className="text-base font-semibold text-text">{title}</D.Title>
            {description ? (
              <D.Description asChild>
                <div className="mt-1 text-xs text-muted">{description}</div>
              </D.Description>
            ) : (
              <D.Description className="sr-only">Detalhes</D.Description>
            )}
          </div>
          <D.Close className="cursor-pointer rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label="Fechar">
            <X className="h-4 w-4" />
          </D.Close>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-3">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}

// ---------------------------------------------------------------- Sheet (painel lateral)
export const Sheet = D.Root;

export function SheetContent({
  children,
  title,
  description,
  side = 'right',
  className,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  side?: 'right' | 'left';
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <D.Content
        className={cn(
          'fixed top-0 z-50 flex h-full w-full flex-col border-border bg-surface shadow-2xl focus:outline-none sm:w-[600px]',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <D.Title asChild>
              <div className="text-base font-semibold text-text">{title}</div>
            </D.Title>
            {description ? (
              <D.Description asChild>
                <div className="mt-1 text-xs text-muted">{description}</div>
              </D.Description>
            ) : (
              <D.Description className="sr-only">Detalhes</D.Description>
            )}
          </div>
          <D.Close className="cursor-pointer rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label="Fechar">
            <X className="h-4 w-4" />
          </D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
