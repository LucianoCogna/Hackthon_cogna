import { useMemo, useState } from 'react';
import { Bot, Bug, Check, Clock, Copy, FileText, Gauge, GitPullRequest, Rocket, Sparkles, Timer, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, useScope } from '@/app/store';
import { KpiCard, PageHeader, FadeIn, Legend, AiSeal } from '@/components/shared';
import { ChartCard, TrendChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/overlay';
import { Table, Td, Th } from '@/components/ui/misc';
import { cn } from '@/lib/cn';
import {
  avgAdherence,
  avgLeadTime,
  avgReview,
  bugRate,
  deltaOrNull,
  monthCost,
  monthProjection,
  prevMonth,
  refDay,
  throughputPerSprint,
  weightedAiPct,
  CURRENT_MONTH,
} from '@/lib/aggregates';
import { mean, prSize, sum, usageCost, DEV_COST_PER_SPRINT, pctDelta } from '@/lib/metrics';
import { fmtBRL, fmtDec, fmtDuration, fmtHours, fmtInt, fmtMonth, fmtPct, fmtSigned, fmtNum } from '@/lib/format';
import { milestones } from '@/mocks/milestones';
import { incomingDemand } from '@/mocks/stories';
import { squadById, squads } from '@/mocks/squads';
import { MONTHLY_BUDGET_BRL } from '@/mocks/kiro';

const AIDLC_IDX = 8;

export default function Overview() {
  const scope = useScope();
  // Dev: visão limitada aos próprios PRs e ao próprio uso de IA (sem squad, custo do time nem demanda)
  const individual = useApp().persona === 'dev';
  const [open, setOpen] = useState(false);
  const hasPrev = scope.prevSprints.length > 0;
  const n = scope.scopeSprints.length;

  const k = useMemo(() => {
    const lead = avgLeadTime(scope.prs);
    const leadPrev = avgLeadTime(scope.prevPrs);
    const thr = throughputPerSprint(scope.stories, n);
    const thrPrev = throughputPerSprint(scope.prevStories, scope.prevSprints.length);
    const ai = weightedAiPct(scope.prs);
    const aiPrev = weightedAiPct(scope.prevPrs);
    const rev = avgReview(scope.prs);
    const revPrev = avgReview(scope.prevPrs);
    const bug = bugRate(scope.prs);
    const bugPrev = bugRate(scope.prevPrs);
    const cost = monthCost(scope.allUsage, CURRENT_MONTH, refDay);
    const costPrev = monthCost(scope.allUsage, prevMonth(CURRENT_MONTH), refDay);
    const proj = monthProjection(scope.allUsage);
    const expected = mean(scope.prs.map((p) => Math.max(10, (prSize(p) / 1000) * 30)));
    return { lead, leadPrev, thr, thrPrev, ai, aiPrev, rev, revPrev, bug, bugPrev, cost, costPrev, proj, expected };
  }, [scope, n]);

  const series = scope.series;
  const sp = (key: keyof (typeof series)[number]) => series.map((s) => Number(s[key]));
  const scopeRange: [string, string] = [`S${scope.scopeSprints[0].index + 1}`, `S${scope.scopeSprints[n - 1].index + 1}`];

  // ---- Antes × Depois do AI-DLC
  const beforeAfter = useMemo(() => {
    const before = scope.allPrs.filter((p) => Number(p.sprintId.slice(1)) - 1 < AIDLC_IDX);
    const after = scope.allPrs.filter((p) => Number(p.sprintId.slice(1)) - 1 > AIDLC_IDX);
    const bs = scope.allStories.filter((s) => Number(s.sprintId.slice(1)) - 1 < AIDLC_IDX);
    const as = scope.allStories.filter((s) => Number(s.sprintId.slice(1)) - 1 > AIDLC_IDX);
    const nb = AIDLC_IDX;
    const na = 14 - AIDLC_IDX - 1;
    const cpp = (from: number, to: number) => {
      const pts = series.slice(from, to);
      const cost = sum(pts.map((p) => p.aiCost)) + pts.length * scope.devCount * DEV_COST_PER_SPRINT;
      return cost / Math.max(1, sum(pts.map((p) => p.throughput)));
    };
    const rows = [
      { label: 'Throughput (pontos/sprint)', b: throughputPerSprint(bs, nb), a: throughputPerSprint(as, na), up: true, f: fmtInt },
      { label: 'PRs por sprint', b: before.length / nb, a: after.length / na, up: true, f: fmtInt },
      { label: 'Lead time (abertura → merge)', b: avgLeadTime(before), a: avgLeadTime(after), up: false, f: fmtHours },
      { label: 'Linhas por PR', b: mean(before.map(prSize)), a: mean(after.map(prSize)), up: false, f: fmtInt, note: 'PRs maiores' },
      { label: 'Tempo médio de revisão', b: avgReview(before), a: avgReview(after), up: true, f: fmtDuration, note: 'paradoxo' },
      { label: '% de código gerado por IA', b: weightedAiPct(before), a: weightedAiPct(after), up: null, f: (v: number) => fmtPct(v) },
      { label: 'Taxa de hotfix/revert', b: bugRate(before), a: bugRate(after), up: false, f: (v: number) => fmtPct(v, 1) },
      { label: 'Aderência PR × história', b: avgAdherence(before), a: avgAdherence(after), up: true, f: (v: number) => fmtPct(v) },
      { label: 'Custo por ponto entregue', b: cpp(0, nb), a: cpp(AIDLC_IDX + 1, 14), up: false, f: fmtBRL },
    ];
    return individual ? rows.filter((r) => !r.label.startsWith('Throughput') && !r.label.startsWith('Custo por ponto')) : rows;
  }, [scope, series, individual]);

  // ---- Squads com hotfix acima da média (narrativa de risco)
  const hotSquads = useMemo(() => {
    const after = scope.allPrs.filter((p) => Number(p.sprintId.slice(1)) - 1 > AIDLC_IDX);
    const avg = bugRate(after);
    return squads
      .map((s) => ({ s, rate: bugRate(after.filter((p) => p.squadId === s.id)) }))
      .filter((x) => x.rate > avg * 1.4 && x.rate > 0)
      .sort((a, b) => b.rate - a.rate);
  }, [scope]);

  const demandData = series.map((s) => ({
    label: s.label,
    incoming: Math.round(incomingDemand[s.index] * (scope.squadCount / 8)),
    delivered: s.delivered,
  }));
  const servedBefore = mean(demandData.slice(0, AIDLC_IDX).map((d) => (100 * d.delivered) / d.incoming));
  const servedAfter = mean(demandData.slice(AIDLC_IDX + 1).map((d) => (100 * d.delivered) / d.incoming));

  const row = (prefix: string) => beforeAfter.find((r) => r.label.startsWith(prefix))!;
  const thrDelta = individual ? 0 : pctDelta(row('Throughput').a, row('Throughput').b);
  const leadDelta = pctDelta(row('Lead time').a, row('Lead time').b);

  // o resumo executivo usa as linhas na ordem completa; não existe na visão individual
  const summary = individual ? '' : buildSummary({
    thrDelta,
    leadDelta,
    ba: beforeAfter,
    hotSquads: hotSquads.map((h) => `${h.s.name} (${fmtPct(h.rate, 1)})`),
    cost: k.proj,
    servedBefore,
    servedAfter,
  });

  return (
    <div>
      <PageHeader
        eyebrow={individual ? 'Visão Executiva · Individual' : 'Visão Executiva'}
        title={individual ? 'A IA está mexendo nos seus ponteiros?' : 'A IA está mexendo nos ponteiros?'}
        subtitle={
          individual ? (
            <>
              Seus PRs e seu uso do Kiro antes e depois dos marcos <span className="text-accent">Dev Hub</span> e{' '}
              <span className="text-ai">AI-DLC</span>. Período: <span className="num text-text">{scope.scopeLabel}</span>. Só você vê estes números.
            </>
          ) : (
          <>
            Indicadores de velocidade, qualidade e custo da engenharia antes e depois dos marcos{' '}
            <span className="text-accent">Dev Hub</span> e <span className="text-ai">AI-DLC</span>. Período:{' '}
            <span className="num text-text">{scope.scopeLabel}</span>
            {scope.filters.squadId !== 'all' && <> · Squad {squadById[scope.filters.squadId].name}</>}.
          </>
          )
        }
        actions={
          !individual && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              <FileText className="h-4 w-4" /> Gerar resumo executivo
            </Button>
          )
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard index={0} icon={<Clock className="h-3.5 w-3.5" />} label="Lead time médio" value={k.lead} format={fmtHours}
          delta={deltaOrNull(k.lead, k.leadPrev, hasPrev)} goodWhenUp={false} spark={sp('leadTimeH')}
          info="Tempo médio entre a abertura e o merge do PR, considerando apenas PRs mergeados." />
        {individual ? (
          <KpiCard index={1} icon={<GitPullRequest className="h-3.5 w-3.5" />} label="Seus PRs por sprint" value={scope.prs.length / n} format={(v) => fmtDec(v)}
            delta={deltaOrNull(scope.prs.length / n, scope.prevPrs.length / Math.max(1, scope.prevSprints.length), hasPrev)} spark={sp('prs')} sparkColor="var(--ok)"
            info="PRs que você abriu, em média por sprint do período." />
        ) : (
          <KpiCard index={1} icon={<Rocket className="h-3.5 w-3.5" />} label="Throughput" value={k.thr} format={(v) => `${fmtInt(v)} pts`}
            delta={deltaOrNull(k.thr, k.thrPrev, hasPrev)} spark={sp('throughput')} sparkColor="var(--ok)"
            info="Story points de histórias concluídas (Done) por sprint." />
        )}
        <KpiCard index={2} icon={<Bot className="h-3.5 w-3.5" />} label="% código gerado por IA" value={k.ai} format={(v) => fmtPct(v)}
          delta={deltaOrNull(k.ai, k.aiPrev, hasPrev)} goodWhenUp spark={sp('aiPct')} sparkColor="var(--ai)" tone="ai"
          info="Média ponderada por linhas do % de código gerado por IA, estimado pela telemetria do Kiro." />
        <KpiCard index={3} icon={<Timer className="h-3.5 w-3.5" />} label="Tempo médio de revisão" value={k.rev} format={fmtDuration}
          delta={deltaOrNull(k.rev, k.revPrev, hasPrev)} goodWhenUp spark={sp('reviewMin')} sparkColor="var(--warn)" tone="warn"
          footnote={`esperado ~${fmtDuration(k.expected)}`}
          info="Abertura → aprovação. A queda é suspeita quando os PRs crescem: o esperado é ~30 min por 1.000 linhas (mínimo 10 min)." />
        <KpiCard index={4} icon={<Bug className="h-3.5 w-3.5" />} label="Taxa de hotfix/revert" value={k.bug} format={(v) => fmtPct(v, 1)}
          delta={deltaOrNull(k.bug, k.bugPrev, hasPrev)} goodWhenUp={false} spark={sp('bugRate')} sparkColor="var(--risk)"
          info="% de PRs que geraram hotfix ou foram revertidos após o merge (proxy de densidade de bug)." />
        <KpiCard index={5} icon={<Wallet className="h-3.5 w-3.5" />} label={`Custo de IA · ${fmtMonth(CURRENT_MONTH + '-01').split(' ')[0]}`} value={k.cost} format={fmtBRL}
          delta={k.costPrev ? pctDelta(k.cost, k.costPrev) : null} goodWhenUp={false} spark={sp('aiCost')} sparkColor="var(--ai)"
          footnote={`proj. ${fmtBRL(k.proj.projection)}`}
          tone={!individual && k.proj.projection > MONTHLY_BUDGET_BRL * (scope.squadCount / 8) ? 'risk' : undefined}
          info="Custo do Kiro no mês até hoje, comparado ao mesmo intervalo do mês anterior. A projeção extrapola pelos dias úteis." />
      </div>

      {/* Gráfico-assinatura */}
      <FadeIn delay={0.15} className="mt-4">
        <ChartCard
          title="Os ponteiros ao longo do tempo"
          description="Por sprint, com os marcos Dev Hub e AI-DLC. A faixa destacada é o período selecionado."
          info="Cada indicador tem sua própria escala; por isso são três gráficos lado a lado, e não um gráfico com dois eixos."
          actions={<Legend items={[{ label: 'Dev Hub', color: 'var(--accent)', dashed: true }, { label: 'AI-DLC', color: 'var(--ai)', dashed: true }]} />}
        >
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[
              individual
                ? { key: 'aiPct', name: '% código gerado por IA', unit: 'média dos seus PRs', color: 'var(--ai)', f: (v: number) => fmtPct(v), good: 'up' }
                : { key: 'throughput', name: 'Throughput', unit: 'pontos por sprint', color: 'var(--ok)', f: (v: number) => `${fmtInt(v)} pts`, good: 'up' },
              { key: 'leadTimeH', name: 'Lead time', unit: 'horas, abertura → merge', color: 'var(--accent)', f: fmtHours, good: 'down' },
              { key: 'bugRate', name: 'Taxa de hotfix/revert', unit: '% dos PRs', color: 'var(--risk)', f: (v: number) => fmtPct(v, 1), good: 'down' },
            ].map((m) => {
              const vals = sp(m.key as 'throughput');
              const b = mean(vals.slice(0, AIDLC_IDX));
              const a = mean(vals.slice(AIDLC_IDX + 1));
              const d = pctDelta(a, b);
              const good = m.good === 'up' ? d > 0 : d < 0;
              return (
                <div key={m.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-[11px] text-muted">{m.unit}</div>
                    </div>
                    <div className="text-right">
                      <div className={cn('num text-sm font-semibold', good ? 'text-ok' : 'text-risk')}>{fmtSigned(d)}</div>
                      <div className="text-[10px] text-muted">pós × pré AI-DLC</div>
                    </div>
                  </div>
                  <TrendChart
                    data={series as unknown as Record<string, number | string>[]}
                    series={[{ key: m.key, name: m.name, color: m.color, type: 'area' }]}
                    format={(v) => m.f(v)}
                    yFormat={(v) => fmtNum(v)}
                    scope={scopeRange}
                    height={200}
                    yDomain={[0, 'auto']}
                  />
                </div>
              );
            })}
          </div>
          {!individual && hotSquads.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-risk/30 bg-risk/8 px-3 py-2 text-xs">
              <Bug className="h-4 w-4 text-risk" />
              <span className="text-text">
                <b>Atenção:</b> depois do AI-DLC, a taxa de hotfix está acima da média em{' '}
                {hotSquads.map((h, i) => (
                  <span key={h.s.id}>
                    {i > 0 && ' e '}
                    <b>{h.s.name}</b> <span className="num">({fmtPct(h.rate, 1)})</span>
                  </span>
                ))}
                . São os squads com mais código gerado por IA e as revisões mais curtas.
              </span>
            </div>
          )}
        </ChartCard>
      </FadeIn>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        {/* Antes × Depois */}
        <FadeIn delay={0.2} className={individual ? 'xl:col-span-5' : 'xl:col-span-3'}>
          <ChartCard
            title="Antes × Depois do AI-DLC"
            description={`Média das sprints S1–S${AIDLC_IDX} (antes) vs. S${AIDLC_IDX + 2}–S14 (depois). A sprint de transição fica de fora.`}
            className="h-full"
          >
            <Table>
              <thead>
                <tr>
                  <Th>Indicador</Th>
                  <Th className="text-right">Antes</Th>
                  <Th className="text-right">Depois</Th>
                  <Th className="text-right">Δ</Th>
                </tr>
              </thead>
              <tbody>
                {beforeAfter.map((r) => {
                  const d = pctDelta(r.a, r.b);
                  const tone = r.up === null ? 'text-ai' : (d > 0) === r.up ? 'text-ok' : 'text-risk';
                  return (
                    <tr key={r.label} className="hover:bg-surface-2/50">
                      <Td className="text-text">
                        {r.label}
                        {r.note && <span className="ml-2 rounded bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn">{r.note}</span>}
                      </Td>
                      <Td className="num text-right text-muted">{r.f(r.b)}</Td>
                      <Td className="num text-right font-medium">{r.f(r.a)}</Td>
                      <Td className={cn('num text-right font-semibold', tone)}>{fmtSigned(d)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </ChartCard>
        </FadeIn>

        {!individual && (
        <div className="grid gap-4 xl:col-span-2">
          <FadeIn delay={0.25}>
            <ChartCard
              title="Custo por ponto entregue"
              description="(custo de IA + custo estimado do time) ÷ pontos entregues"
              info={`Custo do time estimado em ${fmtBRL(DEV_COST_PER_SPRINT)} por dev por sprint (mock). Custo de IA = consumo do Kiro.`}
            >
              <TrendChart
                data={series.map((s) => ({ label: s.label, cpp: Math.round(s.costPerPoint) }))}
                series={[{ key: 'cpp', name: 'Custo por ponto', color: 'var(--accent)', type: 'area' }]}
                format={(v) => fmtBRL(v)}
                yFormat={(v) => `${fmtNum(v / 1000, 1)}k`}
                height={170}
                showMilestoneLabels={false}
                scope={scopeRange}
              />
            </ChartCard>
          </FadeIn>
          <FadeIn delay={0.3}>
            <ChartCard
              title="Demanda atendida"
              description="Demanda nova que chega ao backlog vs. pontos entregues, por sprint"
              actions={<Legend items={[{ label: 'Demanda nova', color: 'var(--human)' }, { label: 'Entregue', color: 'var(--ok)' }]} />}
            >
              <TrendChart
                data={demandData}
                series={[
                  { key: 'incoming', name: 'Demanda nova', color: 'var(--human)', dashed: true },
                  { key: 'delivered', name: 'Entregue', color: 'var(--ok)', type: 'area' },
                ]}
                format={(v) => `${fmtInt(v)} pts`}
                height={150}
                showMilestoneLabels={false}
                yDomain={[0, 'auto']}
              />
              <div className="mt-2 flex items-center justify-between rounded-lg bg-surface-2/70 px-3 py-2 text-xs">
                <span className="text-muted">Demanda atendida</span>
                <span className="num">
                  <span className="text-muted">{fmtPct(servedBefore)}</span>
                  <span className="mx-1.5 text-muted">→</span>
                  <span className="font-semibold text-ok">{fmtPct(servedAfter)}</span>
                </span>
              </div>
            </ChartCard>
          </FadeIn>
        </div>
        )}
      </div>

      <FadeIn delay={0.35} className="mt-4">
        <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-r from-accent/10 via-transparent to-ai/10 px-5 py-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
            <Sparkles className="h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm">
              <b>IA não serve para reduzir o time.</b> Serve para atender a{' '}
              <span className="text-accent">demanda reprimida</span> com qualidade. O RADAR mostra se isso está acontecendo.
            </p>
          </div>
        </div>
      </FadeIn>

      {!individual && <SummaryDialog open={open} onOpenChange={setOpen} text={summary} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
function buildSummary(x: {
  thrDelta: number;
  leadDelta: number;
  ba: { label: string; b: number; a: number }[];
  hotSquads: string[];
  cost: { mtd: number; projection: number };
  servedBefore: number;
  servedAfter: number;
}) {
  const [, prsRow, , linesRow, revRow, aiRow, bugRow, adhRow] = x.ba;
  const m = fmtMonth(CURRENT_MONTH + '-01');
  return `UPDATE MENSAL · VP TECH · ${m.toUpperCase()}
Fonte: RADAR · Inteligência de Engenharia

DESTAQUES
• Depois do AI-DLC (${milestones[1].date.split('-').reverse().join('/')}), o throughput subiu ${fmtSigned(x.thrDelta)} e o lead time caiu ${fmtSigned(x.leadDelta)}.
• Atendemos ${fmtPct(x.servedAfter)} da demanda nova por sprint (antes: ${fmtPct(x.servedBefore)}). A IA está sendo usada para destravar a demanda reprimida, não para reduzir o time.
• ${fmtPct(aiRow.a)} do código já é gerado com apoio do Kiro (antes: ${fmtPct(aiRow.b)}).
• Squads com revisão assistida por IA (Plataforma, Financeiro e Dados) mantêm aderência alta e baixa taxa de hotfix.

RISCOS
• Paradoxo dos PRs: o tamanho médio foi de ${fmtInt(linesRow.b)} para ${fmtInt(linesRow.a)} linhas, mas a revisão caiu de ${fmtDuration(revRow.b)} para ${fmtDuration(revRow.a)}. Sinal de revisão superficial.
• A taxa de hotfix/revert foi de ${fmtPct(bugRow.b, 1)} para ${fmtPct(bugRow.a, 1)}${x.hotSquads.length ? `, concentrada em ${x.hotSquads.join(' e ')}` : ''}.
• A aderência PR × história foi de ${fmtPct(adhRow.b)} para ${fmtPct(adhRow.a)}.
• Custo do Kiro no mês: ${fmtBRL(x.cost.mtd)} até agora, com projeção de ${fmtBRL(x.cost.projection)} e risco de overage de licenças.

PRÓXIMOS PASSOS
1. Ligar o check "RADAR / pr-risk" no GitHub Actions para PRs com score ≥ 70.
2. Levar a revisão assistida por IA para Vendas e Mídia, com tempo mínimo de revisão por tamanho de PR.
3. Aplicar a política de roteamento de modelos (Haiku para commit e explicação de código) e hooks determinísticos.
4. Usar o book de indicadores do RADAR no lugar das planilhas manuais a partir do próximo mês.
5. Rodar o workshop de spec-driven development com os squads que têm mais histórias reabertas.

PRs/sprint: ${fmtInt(prsRow.b)} → ${fmtInt(prsRow.a)}`;
}

function SummaryDialog({ open, onOpenChange, text }: { open: boolean; onOpenChange: (o: boolean) => void; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={
          <span className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" /> Resumo executivo para a diretoria
          </span>
        }
        description={<span className="flex items-center gap-2">Gerado a partir dos indicadores do período <AiSeal label="Rascunho gerado por IA" /></span>}
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  /* clipboard indisponível */
                }
                setCopied(true);
                toast.success('Resumo copiado para a área de transferência');
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </>
        }
      >
        <pre className="num whitespace-pre-wrap rounded-lg border border-border bg-bg/60 p-4 text-[12.5px] leading-relaxed text-text">{text}</pre>
      </DialogContent>
    </Dialog>
  );
}

