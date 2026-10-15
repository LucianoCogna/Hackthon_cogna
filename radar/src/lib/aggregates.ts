import type { KiroUsage, PullRequest, Story } from '@/mocks/types';
import { mean, prSize, sum, usageCost, wastedCost, pctDelta } from './metrics';
import { REF_DATE } from '@/mocks/sprints';

export const weightedAiPct = (prs: PullRequest[]) => {
  const total = sum(prs.map(prSize));
  return total ? sum(prs.map((p) => p.aiGeneratedPct * prSize(p))) / total : 0;
};
export const avgLeadTime = (prs: PullRequest[]) => mean(prs.filter((p) => p.mergedAt).map((p) => p.leadTimeH));
export const avgReview = (prs: PullRequest[]) => mean(prs.map((p) => p.reviewTimeMin));
export const bugRate = (prs: PullRequest[]) => (prs.length ? (100 * prs.filter((p) => p.revertedOrHotfix).length) / prs.length : 0);
export const donePoints = (stories: Story[]) => sum(stories.filter((s) => s.status === 'Done').map((s) => s.points));
export const throughputPerSprint = (stories: Story[], sprintCount: number) => (sprintCount ? donePoints(stories) / sprintCount : 0);
export const avgAdherence = (prs: PullRequest[]) =>
  mean(prs.map((p) => p.jiraAdherence).filter((v): v is number => v !== null));

/** Delta % entre escopo e janela anterior; null se não houver janela anterior. */
export const deltaOrNull = (cur: number, prev: number, hasPrev: boolean) => (hasPrev && prev ? pctDelta(cur, prev) : null);

// ---------------------------------------------------------------- Custo mensal
export const CURRENT_MONTH = REF_DATE.slice(0, 7);
export const daysInMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export function prevMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
export const refDay = Number(REF_DATE.slice(8, 10));

export function monthCost(usage: KiroUsage[], ym = CURRENT_MONTH, uptoDay = 31) {
  return sum(
    usage.filter((u) => u.date.startsWith(ym) && Number(u.date.slice(8, 10)) <= uptoDay).map(usageCost),
  );
}
export function monthWaste(usage: KiroUsage[], ym = CURRENT_MONTH) {
  return sum(usage.filter((u) => u.date.startsWith(ym)).map(wastedCost));
}

/** Custo diário por dia corrido (inclui fins de semana com zero). */
export function dailyCost(usage: KiroUsage[], fromISO: string, toISO: string) {
  const by: Record<string, number> = {};
  for (const u of usage) if (u.date >= fromISO && u.date <= toISO) by[u.date] = (by[u.date] ?? 0) + usageCost(u);
  const out: { date: string; cost: number }[] = [];
  const d = new Date(fromISO + 'T12:00:00Z');
  const end = new Date(toISO + 'T12:00:00Z');
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, cost: by[iso] ?? 0 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Projeção do mês: média por dia útil decorrido × dias úteis do mês. */
export function monthProjection(usage: KiroUsage[], ym = CURRENT_MONTH) {
  const mtd = monthCost(usage, ym, refDay);
  const [y, m] = ym.split('-').map(Number);
  let elapsedBiz = 0;
  let totalBiz = 0;
  for (let d = 1; d <= daysInMonth(ym); d++) {
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    totalBiz++;
    if (d <= refDay) elapsedBiz++;
  }
  return { mtd, projection: elapsedBiz ? (mtd / elapsedBiz) * totalBiz : 0, elapsedBiz, totalBiz };
}
