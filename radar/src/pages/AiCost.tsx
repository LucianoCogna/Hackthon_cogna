import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { AlertOctagon, ArrowRight, Ban, Coins, GitMerge, Route, Wallet, Zap } from 'lucide-react';
import { useScope } from '@/app/store';
import { DevAvatar, EmptyState, FadeIn, KpiCard, Legend, PageHeader, SquadTag } from '@/components/shared';
import { ChartCard, ChartTooltip, axisProps, gridProps } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress, Table, Td, Th } from '@/components/ui/misc';
import { devById } from '@/mocks/devs';
import { MONTHLY_BUDGET_BRL, RECOMMENDED, ROUTING, TASKS, CREDIT_BRL, MODEL_MULT, TASK_BASE } from '@/mocks/kiro';
import { REF_DATE, addDays } from '@/mocks/sprints';
import type { KiroModel, KiroTask } from '@/mocks/types';
import { groupBy, idealCost, modelFits, sum, usageCost, wastedCost } from '@/lib/metrics';
import { CURRENT_MONTH, dailyCost, monthProjection, monthWaste, prevMonth, monthCost, refDay } from '@/lib/aggregates';
import { fmtBRL, fmtBRL2, fmtDate, fmtInt, fmtMonth, fmtNum, fmtPct } from '@/lib/format';
import { MODEL_COLOR, shortModel } from './AiUsage';
import { cn } from '@/lib/cn';

const ModelChip = ({ m }: { m: KiroModel }) => (
  <span className="inline-flex items-center gap-1.5 text-xs">
    <span className="h-2 w-2 rounded-sm" style={{ background: MODEL_COLOR[m] }} />
    {shortModel(m)}
  </span>
);

const taskReason: Record<KiroTask, string> = {
  commit: 'Mensagem curta e padronizada',
  'explicar código': 'Leitura e resumo de trecho pequeno',
  'gerar testes': 'Precisa de contexto do código e boa qualidade',
  refatorar: 'Mudança estrutural com contexto médio',
  debug: 'Raciocínio sobre stack trace e código',
  feature: 'Implementação com múltiplos arquivos',
  spec: 'Arquitetura e decisões de design. Fable só para specs complexas.',
  review: 'Revisão crítica de diff grande',
};

export default function AiCost() {
  const scope = useScope();
  const scale = scope.squadCount / 8;
  const budget = MONTHLY_BUDGET_BRL * scale;
  const proj = monthProjection(scope.allUsage);
  const mtdPrev = monthCost(scope.allUsage, prevMonth(CURRENT_MONTH), refDay);
  const wasteMonth = monthWaste(scope.allUsage);
  const overage = proj.projection - budget;

  const mergedPrs = scope.prs.filter((p) => p.mergedAt).length;
  const scopeCost = sum(scope.usage.map(usageCost));
  const prevMerged = scope.prevPrs.filter((p) => p.mergedAt).length;
  const prevCost = sum(scope.prevUsage.map(usageCost));
  const cpp = mergedPrs ? scopeCost / mergedPrs : 0;
  const cppPrev = prevMerged ? prevCost / prevMerged : 0;

  const from = addDays(REF_DATE, -59);
  const daily = useMemo(() => dailyCost(scope.allUsage, from, REF_DATE).filter((d) => { const wd = new Date(d.date + 'T12:00:00Z').getUTCDay(); return wd !== 0 && wd !== 6; }).map((d) => ({ ...d, label: fmtDate(d.date) })), [scope.allUsage, from]);
  const dailyBudget = budget / 21;

  const waste = useMemo(() => {
    const bad = scope.usage.filter((u) => !modelFits(u) && wastedCost(u) > 0);
    const g = groupBy(bad, (u) => `${u.devId}|${u.taskType}|${u.model}`);
    return Object.entries(g)
      .map(([k, us]) => {
        const [devId, task, model] = k.split('|') as [string, KiroTask, KiroModel];
        const real = sum(us.map(usageCost));
        const ideal = sum(us.map(idealCost));
        return { devId, task, model, rec: RECOMMENDED[task], calls: sum(us.map((u) => u.calls)), real, ideal, save: real - ideal };
      })
      .sort((a, b) => b.save - a.save);
  }, [scope.usage]);
  const totalWaste = sum(waste.map((w) => w.save));

  const commits = scope.usage.filter((u) => u.taskType === 'commit');
  const commitCalls = sum(commits.map((u) => u.calls));
  const commitCost = sum(commits.map(usageCost));
  const explain = sum(scope.usage.filter((u) => u.taskType === 'explicar código').map((u) => u.calls));
  const noLlm = [
    { task: 'Mensagem de commit', calls: commitCalls, cost: commitCost, fix: 'Hook de commit com template Conventional Commits' },
    { task: 'Formatar código', calls: Math.round(explain * 0.22), cost: Math.round(explain * 0.22) * TASK_BASE['explicar código'] * MODEL_MULT['Claude Sonnet'] * CREDIT_BRL, fix: 'Prettier/ESLint no hook on-save' },
    { task: 'Contar linhas / arquivos', calls: Math.round(explain * 0.09), cost: Math.round(explain * 0.09) * TASK_BASE['explicar código'] * MODEL_MULT['Claude Opus'] * CREDIT_BRL, fix: 'Script determinístico (cloc / wc)' },
  ];

  const monthName = fmtMonth(CURRENT_MONTH + '-01');

  return (
    <div>
      <PageHeader
        eyebrow="Custo & Governança de Modelos"
        title="Quanto custa, e quanto está sendo desperdiçado"
        subtitle="Consumo do Kiro, projeção contra o orçamento e uso de modelos caros em tarefas triviais. Exemplo: pedir commit para o modelo mais caro."
      />

      {overage > 0 && (
        <FadeIn className="mb-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-risk/40 bg-risk/10 px-4 py-3 text-sm">
            <AlertOctagon className="h-5 w-5 text-risk" />
            <span>
              <b>Risco de overage:</b> a projeção de {monthName} é <b className="num">{fmtBRL(proj.projection)}</b>, ou{' '}
              <b className="num text-risk">{fmtBRL(overage)}</b> acima do orçamento de <span className="num">{fmtBRL(budget)}</span>.
              Só a correção de modelo economizaria cerca de <b className="num text-ok">{fmtBRL(wasteMonth * (proj.totalBiz / Math.max(1, proj.elapsedBiz)))}</b> no mês.
            </span>
          </div>
        </FadeIn>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard index={0} icon={<Wallet className="h-3.5 w-3.5" />} label={`Custo de ${monthName.split(' ')[0]} (até hoje)`} value={proj.mtd} format={fmtBRL}
          delta={mtdPrev ? ((proj.mtd - mtdPrev) / mtdPrev) * 100 : null} goodWhenUp={false}
          info="Custo do Kiro no mês corrente comparado ao mesmo intervalo do mês anterior." />
        <KpiCard index={1} icon={<Coins className="h-3.5 w-3.5" />} label="Projeção vs. orçamento" value={proj.projection} format={fmtBRL}
          tone={overage > 0 ? 'risk' : undefined}
          footnote={<span className={cn(overage > 0 ? 'text-risk' : 'text-ok')}>{fmtPct((100 * proj.projection) / budget)} do orçamento ({fmtBRL(budget)})</span>}
          info="Média por dia útil decorrido × dias úteis do mês." />
        <KpiCard index={2} icon={<Ban className="h-3.5 w-3.5" />} label="Custo desperdiçado no período" value={totalWaste} format={fmtBRL} tone="warn"
          footnote={scopeCost ? `${fmtPct((100 * totalWaste) / scopeCost)} do custo` : undefined}
          info="Custo real − custo se cada chamada tivesse usado o modelo recomendado para a tarefa." />
        <KpiCard index={3} icon={<GitMerge className="h-3.5 w-3.5" />} label="Custo de IA por PR mergeado" value={cpp} format={fmtBRL2}
          delta={cppPrev ? ((cpp - cppPrev) / cppPrev) * 100 : null} goodWhenUp={false} />
      </div>

      <FadeIn delay={0.1} className="mt-4">
        <ChartCard
          title="Custo diário de IA"
          description="Dias úteis dos últimos 60 dias, em milhares de R$. A linha tracejada é o orçamento diário (orçamento do mês ÷ 21 dias úteis)."
          actions={<Legend items={[{ label: 'Custo diário', color: 'var(--ai)' }, { label: 'Orçamento diário', color: 'var(--risk)', dashed: true }]} />}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 10, right: 8, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="cost-g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--ai)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--ai)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval={4} />
                <YAxis {...axisProps} tickFormatter={(v) => `${fmtNum(v / 1000, 1)}k`} width={40} />
                <RTooltip content={<ChartTooltip format={(v) => fmtBRL(v)} />} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
                <ReferenceLine y={dailyBudget} stroke="var(--risk)" strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `orçamento ${fmtBRL(dailyBudget)}/dia`, position: 'insideTopRight', fill: 'var(--risk)', fontSize: 11 }} />
                <Area type="monotone" dataKey="cost" name="Custo" stroke="var(--ai)" strokeWidth={2} fill="url(#cost-g)" dot={false} isAnimationActive={false}
                  activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-muted">Consumo do orçamento de {monthName.split(' ')[0]}</span>
            <Progress value={(100 * proj.mtd) / budget} color={proj.mtd / budget > proj.elapsedBiz / proj.totalBiz ? 'var(--risk)' : 'var(--ok)'} className="h-2 flex-1" />
            <span className="num">{fmtPct((100 * proj.mtd) / budget)}</span>
            <span className="text-muted">· {fmtPct((100 * proj.elapsedBiz) / proj.totalBiz)} do mês decorrido</span>
          </div>
        </ChartCard>
      </FadeIn>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <FadeIn delay={0.15} className="xl:col-span-2">
          <Card className="h-full overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <div className="text-sm font-semibold">Desperdícios detectados</div>
              <div className="text-xs text-muted">Modelo inadequado para a tarefa · período {scope.scopeLabel} · {waste.length} combinações</div>
            </div>
            {waste.length === 0 ? (
              <div className="p-5"><EmptyState description="Nenhum desperdício no filtro atual." /></div>
            ) : (
              <div className="max-h-[440px] overflow-y-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Dev</Th>
                      <Th>Tarefa</Th>
                      <Th>Usado → recomendado</Th>
                      <Th className="text-right">Chamadas</Th>
                      <Th className="text-right">Economia</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {waste.slice(0, 25).map((w) => (
                      <tr key={`${w.devId}${w.task}${w.model}`} className="hover:bg-surface-2/50">
                        <Td>
                          <div className="flex items-center gap-2">
                            <DevAvatar name={devById[w.devId].name} size={24} />
                            <div>
                              <div className="text-sm">{devById[w.devId].name}</div>
                              <SquadTag id={devById[w.devId].squadId} className="text-[11px]" />
                            </div>
                          </div>
                        </Td>
                        <Td><Badge tone={w.task === 'commit' || w.task === 'explicar código' ? 'risk' : 'neutral'}>{w.task}</Badge></Td>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <ModelChip m={w.model} /> <ArrowRight className="h-3 w-3 text-muted" /> <ModelChip m={w.rec} />
                          </span>
                        </Td>
                        <Td className="num text-right">{fmtInt(w.calls)}</Td>
                        <Td className="num text-right">
                          <div className="font-semibold text-ok">{fmtBRL(w.save)}</div>
                          <div className="text-[11px] text-muted">{fmtBRL(w.real)} → {fmtBRL(w.ideal)}</div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card className="h-full p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-warn" /> Tarefas que nem precisam de LLM</div>
            <p className="mb-4 text-xs text-muted">Trabalho determinístico que pode sair do modelo e virar hook ou skill determinística, com custo R$ 0.</p>
            <div className="space-y-3">
              {noLlm.map((t) => (
                <div key={t.task} className="rounded-lg border border-border bg-surface-2/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.task}</span>
                    <span className="num text-xs text-muted">{fmtInt(t.calls)} chamadas</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted">{t.fix}</span>
                  </div>
                  <div className="num mt-2 flex items-center gap-2 text-xs">
                    <span className="text-risk line-through decoration-risk/50">{fmtBRL(t.cost)}</span>
                    <ArrowRight className="h-3 w-3 text-muted" />
                    <span className="font-semibold text-ok">R$ 0</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.25} className="mt-4">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4 text-accent" /> Política de roteamento de modelos</div>
              <div className="text-xs text-muted">Somente leitura · versão 1.2 · aprovada pelo Comitê de IA</div>
            </div>
            <Badge tone="accent">em vigor</Badge>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Tarefa</Th>
                <Th>Modelo recomendado</Th>
                <Th>Também aceito</Th>
                <Th>Motivo</Th>
                <Th className="text-right">Custo relativo</Th>
              </tr>
            </thead>
            <tbody>
              {TASKS.map((t) => (
                <tr key={t} className="hover:bg-surface-2/50">
                  <Td className="font-medium">{t}</Td>
                  <Td><ModelChip m={RECOMMENDED[t]} /></Td>
                  <Td>
                    <span className="flex gap-3">
                      {ROUTING[t].filter((m) => m !== RECOMMENDED[t]).map((m) => <ModelChip key={m} m={m} />)}
                      {ROUTING[t].length === 1 && <span className="text-xs text-muted">—</span>}
                    </span>
                  </Td>
                  <Td className="max-w-[360px] whitespace-normal text-xs text-muted">{taskReason[t]}</Td>
                  <Td className="num text-right text-xs">{MODEL_MULT[RECOMMENDED[t]]}×</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </FadeIn>
    </div>
  );
}
