import { useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, Lock, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/misc';
import { getAccessCode, setAccessCode, type ApiError } from '@/lib/jiraApi';

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

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  if (error.auth) return <AccessGate invalid={!!getAccessCode()} />;
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

/** Pede o código de acesso aos dados reais. O modo "Simulado" continua aberto sem código. */
export function AccessGate({ invalid }: { invalid: boolean }) {
  const [code, setCode] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setAccessCode(code.trim());
    // recarrega a página: todas as consultas da aba (Jira e PRs) voltam já com o código
    window.location.reload();
  };
  return (
    <Card className="mx-auto max-w-lg border-accent/30 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Dados reais restritos</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Estes números vêm do Jira da Cogna. Informe o código de acesso do RADAR para ver. Sem o código, use o modo <b>Simulado</b>.
          </p>
          {invalid && <p className="mt-2 text-xs font-medium text-risk">O código salvo neste navegador não é válido. Digite de novo.</p>}
          <form onSubmit={submit} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Código de acesso"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pl-9"
                aria-label="Código de acesso"
                autoFocus
              />
            </div>
            <Button variant="primary" type="submit" disabled={!code.trim()}>
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
