import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function LoadingState({ label = 'Buscando histórias e sprints no Jira…' }: { label?: string }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-accent" /> {label}
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

export function ErrorState({ error, onRetry }: { error: { message: string; code: number }; onRetry: () => void }) {
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
          <div className="text-sm font-semibold">Não foi possível carregar os dados</div>
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
