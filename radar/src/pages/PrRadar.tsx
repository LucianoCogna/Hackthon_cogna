import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bot,
  Calculator,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  GitPullRequest,
  RefreshCcw,
  ShieldAlert,
  Timer,
  XCircle,
  Github,
} from 'lucide-react';
import { useScope } from '@/app/store';
import { AiPctBar, DevAvatar, EmptyState, FadeIn, KpiCard, PageHeader, RiskBadge, SquadTag } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, Select, Tabs } from '@/components/ui/misc';
import { devById } from '@/mocks/devs';
import { squadById, squads } from '@/mocks/squads';
import { heroPr } from '@/mocks/prs';
import type { PullRequest } from '@/mocks/types';
import { expectedReviewMin, prRisk, prSize, reviewRatio, riskBand, riskReasons } from '@/lib/metrics';
import { fmtDate, fmtDuration, fmtInt } from '@/lib/format';
import { cn } from '@/lib/cn';

type Band = 'all' | 'risk' | 'warn';

export default function PrRadar() {
  const scope = useScope();
  const [band, setBand] = useState<Band>('all');
  const [squad, setSquad] = useState('all');
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(12);

  const alerts = useMemo(
    () =>
      scope.prs
        .map((p) => ({ p, score: prRisk(p) }))
        .filter((x) => x.score >= 40)
        .sort((a, b) => b.score - a.score || b.p.aiGeneratedPct - a.p.aiGeneratedPct),
    [scope.prs],
  );
  const visible = alerts
    .filter((a) => !reviewed.has(a.p.id))
    .filter((a) => band === 'all' || riskBand(a.score) === band)
    .filter((a) => squad === 'all' || a.p.squadId === squad);

  const critical = alerts.filter((a) => a.score >= 70 && !reviewed.has(a.p.id)).length;
  const attention = alerts.filter((a) => a.score < 70 && !reviewed.has(a.p.id)).length;
  const fastAi = scope.prs.filter((p) => p.aiGeneratedPct >= 90 && p.reviewTimeMin < 1).length;

  const markReviewed = (p: PullRequest) => {
    setReviewed((s) => new Set(s).add(p.id));
    toast.success(`PR #${p.number} marcado como revisado`, {
      description: 'O alerta saiu do feed e foi registrado na trilha de auditoria.',
      action: { label: 'Desfazer', onClick: () => setReviewed((s) => { const n = new Set(s); n.delete(p.id); return n; }) },
    });
  };

  const checkPr = scope.prs.includes(heroPr) ? heroPr : alerts[0]?.p;

  return (
    <div>
      <PageHeader
        eyebrow="Radar de PRs · Alertas"
        title="PRs que precisam do seu olhar"
        subtitle={<>PRs ordenados por risk score: revisão rápida demais, dependência de IA, desalinhamento com o Jira e ausência de testes. Período: <span className="num text-text">{scope.scopeLabel}</span>.</>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard index={0} icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Alertas críticos" value={critical} format={fmtInt} tone="risk" footnote="score ≥ 70" />
        <KpiCard index={1} icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Em atenção" value={attention} format={fmtInt} tone="warn" footnote="score 40–69" />
        <KpiCard index={2} icon={<Bot className="h-3.5 w-3.5" />} label="≥ 90% IA e aprovados em < 1 min" value={fastAi} format={fmtInt} tone="ai" />
        <KpiCard index={3} icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Revisados nesta sessão" value={reviewed.size} format={fmtInt} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Tabs<Band>
              value={band}
              onChange={setBand}
              items={[
                { value: 'all', label: `Todos (${critical + attention})` },
                { value: 'risk', label: `Crítico (${critical})` },
                { value: 'warn', label: `Atenção (${attention})` },
              ]}
            />
            {scope.filters.squadId === 'all' && (
              <Select
                label="Squad"
                value={squad}
                onChange={setSquad}
                options={[{ value: 'all', label: 'Todos os squads' }, ...squads.map((s) => ({ value: s.id, label: s.name }))]}
                className="w-[170px]"
              />
            )}
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Nenhum alerta" description="Nenhum PR nessa faixa de risco para o filtro atual. Bom sinal!" />
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {visible.slice(0, limit).map((a, i) => (
                  <motion.div
                    key={a.p.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                  >
                    <AlertCard pr={a.p} score={a.score} onReviewed={() => markReviewed(a.p)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {visible.length > limit && (
                <Button variant="outline" className="w-full" onClick={() => setLimit((l) => l + 12)}>
                  Mostrar mais {Math.min(12, visible.length - limit)} de {visible.length - limit}
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {checkPr && <ActionsCheck pr={checkPr} />}
          <Accordion title="Como o score é calculado" icon={<Calculator className="h-4 w-4 text-accent" />} defaultOpen>
            <div className="space-y-3 text-xs">
              <div className="num space-y-1 rounded-lg border border-border bg-bg/60 p-3 text-[11.5px] leading-relaxed">
                <div className="text-muted">// revisão esperada</div>
                <div>esperado = max(10, linhas / 1000 × 30) min</div>
                <div>razão = revisão real / esperado</div>
                <div className="mt-2 text-muted">// risk score (0–100)</div>
                <div><span className="text-risk">+35</span> × (1 − razão) <span className="text-muted">revisão rápida</span></div>
                <div><span className="text-ai">+25</span> × % IA <span className="text-muted">dependência de IA</span></div>
                <div><span className="text-warn">+25</span> × (1 − aderência) <span className="text-muted">não bate com a história</span></div>
                <div><span className="text-warn">+10</span> se não há testes</div>
                <div><span className="text-warn">+5</span> se PR &gt; 1.000 linhas</div>
                <div><span className="text-ok">−15</span> se revisão assistida por IA</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="ok">0–39 Saudável</Badge>
                <Badge tone="warn">40–69 Atenção</Badge>
                <Badge tone="risk">70+ Crítico</Badge>
              </div>
              <p className="leading-relaxed text-muted">
                Revisão rápida não é necessariamente ruim: squads com <b className="text-text">revisão assistida por IA</b> revisam rápido e mantêm
                aderência alta. Por isso ela é um atenuante no score.
              </p>
            </div>
          </Accordion>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function AlertCard({ pr, score, onReviewed }: { pr: PullRequest; score: number; onReviewed: () => void }) {
  const author = devById[pr.authorId];
  const exp = expectedReviewMin(pr);
  const reasons = riskReasons(pr);
  const band = riskBand(score);
  const isHero = pr.id === heroPr.id;
  const ratio = reviewRatio(pr);
  return (
    <Card
      className={cn(
        'card-glow relative overflow-hidden p-4',
        band === 'risk' ? 'border-risk/35' : 'border-warn/25',
        isHero && 'ring-1 ring-risk/50 shadow-[0_0_40px_-12px_var(--risk)]',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', band === 'risk' ? 'bg-risk' : 'bg-warn')} />
      <div className="flex flex-wrap items-start gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <div className="num flex flex-wrap items-center gap-2 text-xs text-muted">
            <GitPullRequest className="h-3.5 w-3.5" />
            <span className="text-text">{pr.repo}</span>
            <span className="font-semibold text-accent">#{pr.number}</span>
            <span>· {fmtDate(pr.createdAt)}</span>
            {pr.mergedAt ? <Badge tone="ai">mergeado</Badge> : <Badge tone="accent">aberto</Badge>}
          </div>
          <div className="mt-1 truncate text-[15px] font-semibold">{pr.title}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><DevAvatar name={author.name} size={20} /> {author.name}</span>
            <SquadTag id={pr.squadId} />
            <span>TL: {squadById[pr.squadId].techLead}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={cn('num text-3xl font-bold leading-none', band === 'risk' ? 'text-risk' : 'text-warn')}>{score}</div>
          <RiskBadge score={score} showScore={false} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 pl-1 md:grid-cols-4">
        <Metric label="Gerado por IA"><AiPctBar value={pr.aiGeneratedPct} /></Metric>
        <Metric label="Linhas">
          <span className="num"><span className="text-ok">+{fmtInt(pr.linesAdded)}</span> <span className="text-risk">−{fmtInt(pr.linesRemoved)}</span></span>
        </Metric>
        <Metric label="Revisão real vs. esperada">
          <span className="num flex items-center gap-1.5">
            <Timer className={cn('h-3.5 w-3.5', ratio < 0.2 ? 'text-risk' : 'text-warn')} />
            <span className={cn('font-semibold', ratio < 0.2 && 'text-risk')}>{fmtDuration(pr.reviewTimeMin)}</span>
            <span className="text-muted">/ ~{fmtDuration(exp)}</span>
          </span>
        </Metric>
        <Metric label="Aderência ao Jira">
          {pr.jiraAdherence === null ? (
            <span className="text-muted">sem história</span>
          ) : (
            <span className="num">
              <span className={cn('font-semibold', pr.jiraAdherence < 60 ? 'text-risk' : pr.jiraAdherence < 80 ? 'text-warn' : 'text-ok')}>{pr.jiraAdherence}%</span>{' '}
              <span className="text-muted">{pr.jiraKey}</span>
            </span>
          )}
        </Metric>
      </div>

      {isHero && (
        <div className="mt-3 rounded-lg border border-risk/30 bg-risk/8 px-3 py-2 pl-3 text-xs">
          <b className="text-risk">Aprovado em {fmtDuration(pr.reviewTimeMin)}</b>, esperado ~{fmtDuration(exp)}.{' '}
          {pr.aiGeneratedPct}% feito por IA e não bate com o card do Jira. Alerta enviado para o Tech Lead.
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5 pl-1">
        {reasons.map((r) => (
          <Badge key={r.text} tone={r.tone}>{r.text}</Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 pl-1">
        <Button size="sm" variant="primary" onClick={onReviewed}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como revisado
        </Button>
        <Button size="sm" onClick={() => toast(`Re-review solicitado para #${pr.number}`, { description: `${squadById[pr.squadId].techLead} e ${pr.reviewerIds.length} revisor(es) foram notificados.` })}>
          <RefreshCcw className="h-3.5 w-3.5" /> Solicitar re-review
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast('Abrindo no GitHub…', { description: `github.com/vptech/${pr.repo}/pull/${pr.number} (simulado)` })}>
          <ExternalLink className="h-3.5 w-3.5" /> Abrir no GitHub
        </Button>
      </div>
    </Card>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2/60 px-3 py-2">
      <div className="mb-1 text-[10.5px] text-muted">{label}</div>
      <div className="text-xs">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ActionsCheck({ pr }: { pr: PullRequest }) {
  const score = prRisk(pr);
  const band = riskBand(score);
  const checks = [
    { name: 'build / test (ubuntu-latest)', ok: true, time: '2m 41s' },
    { name: 'lint', ok: true, time: '38s' },
    { name: 'security / dependency-review', ok: true, time: '51s' },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-2.5 text-xs">
        <Github className="h-4 w-4" />
        <span className="font-semibold">GitHub Actions</span>
        <span className="text-muted">· prévia do check no PR</span>
      </div>
      <div className="px-4 py-3">
        <div className="num mb-3 text-[11px] text-muted">{pr.repo} #{pr.number}</div>
        <div className="space-y-2 text-xs">
          {checks.map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-ok" />
              <span className="num flex-1">{c.name}</span>
              <span className="num text-muted">{c.time}</span>
            </div>
          ))}
          <div className={cn('flex items-center gap-2 rounded-md border px-2 py-2', band === 'risk' ? 'border-risk/40 bg-risk/10' : band === 'warn' ? 'border-warn/40 bg-warn/10' : 'border-ok/40 bg-ok/10')}>
            {band === 'risk' ? <XCircle className="h-4 w-4 text-risk" /> : band === 'warn' ? <AlertTriangle className="h-4 w-4 text-warn" /> : <CheckCircle2 className="h-4 w-4 text-ok" />}
            <span className="num flex-1 font-semibold">RADAR / pr-risk</span>
            <span className={cn('num font-semibold', band === 'risk' ? 'text-risk' : band === 'warn' ? 'text-warn' : 'text-ok')}>
              {band === 'risk' ? 'Crítico' : band === 'warn' ? '⚠️ Atenção' : 'Saudável'} · score {score}
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-md bg-bg/60 p-2.5 text-[11px] leading-relaxed text-muted">
          <CircleDot className="mr-1 inline h-3 w-3 text-accent" />
          Com score ≥ 70, o merge fica bloqueado até um segundo revisor aprovar, ou até o Tech Lead registrar uma justificativa.
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-full bg-risk" /> Required check · branch protection em <span className="num text-text">main</span>
        </div>
      </div>
    </Card>
  );
}
