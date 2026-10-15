import type { KiroUsage, PullRequest, Story, Sprint } from '@/mocks/types';
import { CREDIT_BRL, MODEL_MULT, RECOMMENDED, ROUTING } from '@/mocks/kiro';
import { clamp } from '@/mocks/seed';

// ---------------------------------------------------------------------------
// Helpers genéricos
// ---------------------------------------------------------------------------
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export function groupBy<T, K extends string>(xs: T[], key: (x: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
}
export const pctDelta = (cur: number, prev: number) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : 0);

// ---------------------------------------------------------------------------
// PR: revisão esperada, razão e risk score (seção 5)
// ---------------------------------------------------------------------------
export const prSize = (pr: PullRequest) => pr.linesAdded + pr.linesRemoved;

/** Heurística da liderança: ~30 min por 1.000 linhas, mínimo de 10 min. */
export const expectedReviewMin = (pr: PullRequest) => Math.max(10, (prSize(pr) / 1000) * 30);

/** < 0,2 é suspeito */
export const reviewRatio = (pr: PullRequest) => pr.reviewTimeMin / expectedReviewMin(pr);

const riskCache = new Map<string, number>();
export function prRisk(pr: PullRequest): number {
  const c = riskCache.get(pr.id);
  if (c !== undefined) return c;
  const r =
    35 * clamp(1 - reviewRatio(pr), 0, 1) +
    25 * (pr.aiGeneratedPct / 100) +
    25 * (1 - (pr.jiraAdherence ?? 50) / 100) +
    10 * (pr.testsAdded ? 0 : 1) +
    5 * (prSize(pr) > 1000 ? 1 : 0) -
    15 * (pr.aiAssistedReview ? 1 : 0);
  const v = Math.round(clamp(r, 0, 100));
  riskCache.set(pr.id, v);
  return v;
}

export type RiskBand = 'ok' | 'warn' | 'risk';
export const riskBand = (score: number): RiskBand => (score >= 70 ? 'risk' : score >= 40 ? 'warn' : 'ok');
export const riskLabel: Record<RiskBand, string> = { ok: 'Saudável', warn: 'Atenção', risk: 'Crítico' };

/** Motivos legíveis para o card de alerta. */
export function riskReasons(pr: PullRequest): { text: string; tone: RiskBand | 'ai' }[] {
  const out: { text: string; tone: RiskBand | 'ai' }[] = [];
  const ratio = reviewRatio(pr);
  if (ratio < 0.2) {
    const x = Math.round(1 / Math.max(ratio, 0.001));
    out.push({ text: `Revisão ${x}× mais rápida que o esperado`, tone: 'risk' });
  } else if (ratio < 0.5) out.push({ text: 'Revisão abaixo do tempo esperado', tone: 'warn' });
  if (pr.aiGeneratedPct >= 80) out.push({ text: `${pr.aiGeneratedPct}% gerado por IA`, tone: 'ai' });
  for (const n of pr.adherenceNotes) {
    if (n.includes('não encontrado')) out.push({ text: n.replace(/ \(.+\)/, '').replace(' não encontrado no diff', ' não atendido'), tone: 'risk' });
  }
  if (pr.jiraKey === null) out.push({ text: 'Sem história no Jira', tone: 'warn' });
  if (!pr.testsAdded) out.push({ text: 'Sem testes', tone: 'warn' });
  if (prSize(pr) > 1000) out.push({ text: `PR gigante (${new Intl.NumberFormat('pt-BR').format(prSize(pr))} linhas)`, tone: 'warn' });
  if (pr.reviewComments === 0) out.push({ text: 'Nenhum comentário de review', tone: 'warn' });
  if (pr.aiAssistedReview) out.push({ text: 'Revisão assistida por IA (atenuante)', tone: 'ok' });
  return out;
}

// ---------------------------------------------------------------------------
// Kiro: custo, adequação de modelo e eficiência
// ---------------------------------------------------------------------------
export const usageCost = (u: KiroUsage) => u.credits * CREDIT_BRL;
export const modelFits = (u: KiroUsage) => ROUTING[u.taskType].includes(u.model);
/** Custo se tivesse usado o modelo recomendado. */
export const idealCost = (u: KiroUsage) =>
  modelFits(u) ? usageCost(u) : (usageCost(u) * MODEL_MULT[RECOMMENDED[u.taskType]]) / MODEL_MULT[u.model];
export const wastedCost = (u: KiroUsage) => Math.max(0, usageCost(u) - idealCost(u));
export const isTrivialOverkill = (u: KiroUsage) =>
  (u.taskType === 'commit' || u.taskType === 'explicar código') &&
  (u.model === 'Claude Opus' || u.model === 'Claude Fable');

export type KiroStats = {
  calls: number;
  cost: number;
  wasted: number;
  acceptanceRate: number;
  modelFitRate: number;
  specDrivenRate: number;
  skillUsageRate: number;
  efficiency: number;
};

export function kiroStats(us: KiroUsage[]): KiroStats {
  const calls = sum(us.map((u) => u.calls));
  const w = (pred: (u: KiroUsage) => boolean) => (calls ? sum(us.filter(pred).map((u) => u.calls)) / calls : 0);
  const features = us.filter((u) => u.taskType === 'feature' || u.taskType === 'spec');
  const fCalls = sum(features.map((u) => u.calls));
  const acceptanceRate = w((u) => u.accepted);
  const modelFitRate = w(modelFits);
  const specDrivenRate = fCalls ? sum(features.filter((u) => u.specDriven).map((u) => u.calls)) / fCalls : 0;
  const skillUsageRate = w((u) => u.usedSkill !== null);
  return {
    calls,
    cost: sum(us.map(usageCost)),
    wasted: sum(us.map(wastedCost)),
    acceptanceRate,
    modelFitRate,
    specDrivenRate,
    skillUsageRate,
    efficiency: us.length
      ? 100 * (0.4 * acceptanceRate + 0.3 * modelFitRate + 0.2 * specDrivenRate + 0.1 * skillUsageRate)
      : 0,
  };
}

// ---------------------------------------------------------------------------
// Jira: aderência e auditoria
// ---------------------------------------------------------------------------
export function storyAdherence(prs: PullRequest[]) {
  const vals = prs.map((p) => p.jiraAdherence).filter((v): v is number => v !== null);
  return vals.length ? Math.round(mean(vals)) : null;
}

// ---------------------------------------------------------------------------
// Séries por sprint
// ---------------------------------------------------------------------------
/** Custo estimado do time por dev por sprint (R$, mock). */
export const DEV_COST_PER_SPRINT = 9800;

export type SprintPoint = {
  sprintId: string;
  label: string;
  index: number;
  prs: number;
  throughput: number;
  leadTimeH: number;
  reviewMin: number;
  linesPerPr: number;
  aiPct: number;
  bugRate: number;
  adherence: number;
  aiCost: number;
  costPerPoint: number;
  delivered: number;
  backlog: number;
};

export function sprintSeries(
  sprints: Sprint[],
  prs: PullRequest[],
  stories: Story[],
  usage: KiroUsage[],
  devCount: number,
  demand: { incoming: number[]; initial: number; scale: number },
): SprintPoint[] {
  const prBy = groupBy(prs, (p) => p.sprintId);
  const stBy = groupBy(stories, (s) => s.sprintId);
  const usBy = groupBy(usage, (u) => u.sprintId);
  let backlog = demand.initial * demand.scale;
  return sprints.map((sp) => {
    const ps = prBy[sp.id] ?? [];
    const merged = ps.filter((p) => p.mergedAt);
    const done = (stBy[sp.id] ?? []).filter((s) => s.status === 'Done');
    const throughput = sum(done.map((s) => s.points));
    const aiCost = sum((usBy[sp.id] ?? []).map(usageCost));
    const teamCost = devCount * DEV_COST_PER_SPRINT;
    backlog = backlog + demand.incoming[sp.index] * demand.scale - throughput;
    const adh = ps.map((p) => p.jiraAdherence).filter((v): v is number => v !== null);
    return {
      sprintId: sp.id,
      label: `S${sp.index + 1}`,
      index: sp.index,
      prs: ps.length,
      throughput,
      leadTimeH: mean(merged.map((p) => p.leadTimeH)),
      reviewMin: mean(ps.map((p) => p.reviewTimeMin)),
      linesPerPr: mean(ps.map(prSize)),
      aiPct: mean(ps.map((p) => p.aiGeneratedPct)),
      bugRate: ps.length ? (100 * ps.filter((p) => p.revertedOrHotfix).length) / ps.length : 0,
      adherence: mean(adh),
      aiCost,
      costPerPoint: throughput ? (aiCost + teamCost) / throughput : 0,
      delivered: throughput,
      backlog: Math.max(0, Math.round(backlog)),
    };
  });
}
