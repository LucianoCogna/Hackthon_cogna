import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Check, Copy, Download, FileStack, Hourglass, MessagesSquare, RotateCcw, Server } from 'lucide-react';
import { useScope } from '@/app/store';
import { AiSeal, EmptyState, FadeIn, KpiCard, PageHeader, SquadTag } from '@/components/shared';
import { ChartCard, TrendChart } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress, Tabs } from '@/components/ui/misc';
import { Dialog, DialogContent } from '@/components/ui/overlay';
import { epics, meetingRisks, infraTicketHours } from '@/mocks/projects';
import { squadById } from '@/mocks/squads';
import { sprints, REF_DATE } from '@/mocks/sprints';
import type { Epic, EpicStatus } from '@/mocks/types';
import { fmtDate, fmtDateLong, fmtHours, fmtInt, fmtMonth } from '@/lib/format';
import { sum } from '@/lib/metrics';
import { cn } from '@/lib/cn';

const statusTone: Record<EpicStatus, Tone> = { 'No prazo': 'ok', Atenção: 'warn', Atrasado: 'risk', Entregue: 'accent' };
const statusColor: Record<EpicStatus, string> = { 'No prazo': 'var(--ok)', Atenção: 'var(--warn)', Atrasado: 'var(--risk)', Entregue: 'var(--accent)' };
const sevTone = { alta: 'risk', média: 'warn', baixa: 'neutral' } as const;

const dayDiff = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export default function Projects() {
  const scope = useScope();
  const [view, setView] = useState<'grid' | 'timeline'>('grid');
  const [open, setOpen] = useState(false);
  const list = epics.filter((e) => scope.inSquad(e.squadId));
  const risks = meetingRisks.filter((r) => scope.inSquad(r.squadId));
  const count = (s: EpicStatus) => list.filter((e) => e.status === s).length;

  const reopenedBySpec = scope.stories.filter((s) => s.reopenCount > 0 && s.specQuality < 60).length;
  const infraSeries = sprints.map((s, i) => ({ label: `S${s.index + 1}`, h: infraTicketHours[i] }));
  const infraNow = infraTicketHours[sprints.length - 1];
  const infraBefore = infraTicketHours[0];

  const report = useMemo(() => buildReport(list, risks), [list, risks]);

  return (
    <div>
      <PageHeader
        eyebrow="Status de Projetos"
        title="Status mensal, sem planilha"
        subtitle="Épicos, previsão contra o planejado e riscos extraídos de reuniões. Tudo consolidado automaticamente a partir do Jira e das atas (simulado)."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Download className="h-4 w-4" /> Exportar status mensal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard index={0} label="Entregues" value={count('Entregue')} format={fmtInt} sparkColor="var(--accent)" />
        <KpiCard index={1} label="No prazo" value={count('No prazo')} format={fmtInt} />
        <KpiCard index={2} label="Em atenção" value={count('Atenção')} format={fmtInt} tone="warn" />
        <KpiCard index={3} label="Atrasados" value={count('Atrasado')} format={fmtInt} tone="risk" />
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Épicos <span className="text-muted">({list.length})</span></h2>
        <Tabs value={view} onChange={setView} items={[{ value: 'grid', label: 'Cards' }, { value: 'timeline', label: 'Roadmap' }]} />
      </div>

      {list.length === 0 ? (
        <EmptyState description="Nenhum épico para o squad selecionado." />
      ) : view === 'grid' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {list.map((e, i) => (
            <FadeIn key={e.key} delay={i * 0.03}>
              <EpicCard e={e} />
            </FadeIn>
          ))}
        </div>
      ) : (
        <Roadmap list={list} />
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <FadeIn delay={0.1} className="xl:col-span-2">
          <Card className="h-full p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold"><MessagesSquare className="h-4 w-4 text-accent" /> Riscos detectados em reuniões</div>
              <AiSeal label="Extraído por IA" />
            </div>
            <p className="mb-4 text-xs text-muted">Riscos recorrentes encontrados em atas, dailies e canais. Mais menções significam mais urgência.</p>
            {risks.length === 0 ? <EmptyState description="Nenhum risco mencionado para este squad." /> : (
              <ul className="space-y-2">
                {risks.sort((a, b) => b.mentions - a.mentions).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2/50 p-3">
                    <Badge tone={sevTone[r.severity]}>{r.severity}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{r.text}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <SquadTag id={r.squadId} /> · {r.source} · {r.when}
                      </div>
                    </div>
                    <span className="num rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">{r.mentions} menções</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </FadeIn>
        <FadeIn delay={0.15}>
          <ChartCard
            title={<span className="flex items-center gap-1.5"><Server className="h-4 w-4 text-accent" /> Outer loop</span>}
            description="Tempo médio de chamados de infra (horas) e histórias reabertas por spec ruim"
            className="h-full"
          >
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface-2/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted"><Hourglass className="h-3 w-3" /> Chamado de infra</div>
                <div className="num mt-1 text-xl font-semibold">{fmtHours(infraNow)}</div>
                <div className="num text-[11px] text-ok">era {fmtHours(infraBefore)} na S1</div>
              </div>
              <div className="rounded-lg bg-surface-2/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted"><RotateCcw className="h-3 w-3" /> Reabertas por spec</div>
                <div className="num mt-1 text-xl font-semibold">{reopenedBySpec}</div>
                <div className="text-[11px] text-muted">spec &lt; 60 · {scope.scopeLabel}</div>
              </div>
            </div>
            <TrendChart data={infraSeries} series={[{ key: 'h', name: 'Chamado de infra', color: 'var(--accent)', type: 'area' }]} height={150}
              format={(v) => fmtHours(v)} showMilestoneLabels={false} yDomain={[0, 'auto']} />
          </ChartCard>
        </FadeIn>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-3xl"
          title={<span className="flex items-center gap-2"><FileStack className="h-4 w-4 text-accent" /> Status mensal · {fmtMonth(REF_DATE)}</span>}
          description="Pronto para colar na apresentação ou enviar por e-mail"
          footer={<CopyButton text={report} />}
        >
          <pre className="num whitespace-pre-wrap rounded-lg border border-border bg-bg/60 p-4 text-[12.5px] leading-relaxed">{report}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EpicCard({ e }: { e: Epic }) {
  const slip = dayDiff(e.plannedEnd, e.forecastEnd);
  return (
    <Card className="card-glow flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="num text-[11px] text-muted">{e.key}</div>
          <div className="mt-0.5 text-sm font-semibold leading-snug">{e.name}</div>
        </div>
        <Badge tone={statusTone[e.status]}>{e.status}</Badge>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <SquadTag id={e.squadId} /> · {e.owner}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Progress value={e.progressPct} color={statusColor[e.status]} />
        <span className="num w-10 text-right text-xs font-semibold">{e.progressPct}%</span>
      </div>
      <div className="num mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-muted">Planejado</div>
          <div>{fmtDate(e.plannedEnd)}</div>
        </div>
        <div>
          <div className="text-muted">Previsão</div>
          <div className={cn(slip > 0 ? 'text-risk' : 'text-ok')}>
            {fmtDate(e.forecastEnd)} {slip > 0 && <span>(+{slip}d)</span>}
          </div>
        </div>
      </div>
      {e.risks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {e.risks.map((r) => (
            <Badge key={r} tone="warn" className="whitespace-normal text-left">{r}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function Roadmap({ list }: { list: Epic[] }) {
  const start = list.reduce((m, e) => (e.plannedStart < m ? e.plannedStart : m), list[0].plannedStart);
  const end = list.reduce((m, e) => (e.forecastEnd > m ? e.forecastEnd : m), list[0].forecastEnd);
  const total = dayDiff(start, end);
  const pos = (d: string) => (100 * dayDiff(start, d)) / total;
  const months: string[] = [];
  const d = new Date(start + 'T12:00:00Z');
  d.setUTCDate(1);
  while (d.toISOString().slice(0, 10) <= end) {
    const iso = d.toISOString().slice(0, 10);
    if (iso >= start) months.push(iso);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return (
    <Card className="overflow-x-auto p-5">
      <div className="min-w-[720px]">
        <div className="relative ml-[200px] h-6 border-b border-border">
          {months.map((m) => (
            <span key={m} className="absolute -translate-x-1/2 text-[10px] text-muted" style={{ left: `${pos(m)}%` }}>
              {fmtMonth(m).split(' ')[0].slice(0, 3)}
            </span>
          ))}
        </div>
        <div className="relative space-y-2 pt-3">
          <div className="pointer-events-none absolute inset-y-0 ml-[200px] w-[calc(100%-200px)]">
            <div className="absolute inset-y-0 w-px bg-accent/50" style={{ left: `${pos(REF_DATE)}%` }}>
              <span className="absolute -top-1 left-1 whitespace-nowrap text-[10px] font-semibold text-accent">hoje</span>
            </div>
          </div>
          {list.map((e) => (
            <div key={e.key} className="flex items-center">
              <div className="w-[200px] shrink-0 pr-3">
                <div className="truncate text-xs font-medium">{e.name}</div>
                <div className="text-[10px] text-muted">{squadById[e.squadId].name}</div>
              </div>
              <div className="relative h-6 flex-1">
                <div className="absolute top-1 h-4 rounded-md border border-dashed border-border" style={{ left: `${pos(e.plannedStart)}%`, width: `${pos(e.plannedEnd) - pos(e.plannedStart)}%` }} />
                <div
                  className="absolute top-1 h-4 overflow-hidden rounded-md"
                  style={{ left: `${pos(e.plannedStart)}%`, width: `${pos(e.forecastEnd) - pos(e.plannedStart)}%`, background: `color-mix(in srgb, ${statusColor[e.status]} 22%, transparent)` }}
                  title={`${e.name}: ${e.progressPct}% · previsão ${fmtDateLong(e.forecastEnd)}`}
                >
                  <div className="h-full rounded-md" style={{ width: `${e.progressPct}%`, background: statusColor[e.status], opacity: 0.85 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded border border-dashed border-border" /> Planejado</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-ok/30" /> Previsão</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded bg-ok" /> Progresso</span>
          <span className="flex items-center gap-1.5"><CalendarClock className="h-3 w-3 text-accent" /> Hoje</span>
        </div>
      </div>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="primary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* ignore */
        }
        setCopied(true);
        toast.success('Status mensal copiado');
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar'}
    </Button>
  );
}

function buildReport(list: Epic[], risks: typeof meetingRisks) {
  const by = (s: EpicStatus) => list.filter((e) => e.status === s);
  const line = (e: Epic) => {
    const slip = dayDiff(e.plannedEnd, e.forecastEnd);
    return `  • ${e.name} (${squadById[e.squadId].name}): ${e.progressPct}%, previsão ${fmtDate(e.forecastEnd)}${slip > 0 ? ` (+${slip} dias)` : ''}${e.risks.length ? `\n      Risco: ${e.risks.join('; ')}` : ''}`;
  };
  return `STATUS MENSAL DE PROJETOS · VP TECH · ${fmtMonth(REF_DATE).toUpperCase()}
Gerado automaticamente pelo RADAR em ${fmtDateLong(REF_DATE)}

RESUMO
  Entregues: ${by('Entregue').length} · No prazo: ${by('No prazo').length} · Em atenção: ${by('Atenção').length} · Atrasados: ${by('Atrasado').length}
  Progresso médio dos épicos ativos: ${Math.round(sum(list.filter((e) => e.status !== 'Entregue').map((e) => e.progressPct)) / Math.max(1, list.filter((e) => e.status !== 'Entregue').length))}%

ATRASADOS
${by('Atrasado').map(line).join('\n') || '  —'}

EM ATENÇÃO
${by('Atenção').map(line).join('\n') || '  —'}

NO PRAZO
${by('No prazo').map(line).join('\n') || '  —'}

ENTREGUES NO PERÍODO
${by('Entregue').map((e) => `  • ${e.name} (${squadById[e.squadId].name})`).join('\n') || '  —'}

RISCOS RECORRENTES (extraídos de reuniões)
${risks.sort((a, b) => b.mentions - a.mentions).map((r) => `  • [${r.severity}] ${r.text} (${r.mentions} menções)`).join('\n') || '  —'}

PEDIDOS DE DECISÃO
  1. Priorizar a automação do provisionamento de filas SQS no Dev Hub (dependência de Vendas).
  2. Definir uma data para a aprovação de segurança do MFA (Portal do Aluno).`;
}
