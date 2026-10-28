// Story points simulados por dev e sprint, coerentes com os PRs do mock:
// quem abre mais PRs tende a ter mais pontos, com variação por pessoa (uns quebram o trabalho
// em muitos PRs pequenos, outros em poucos PRs grandes), como no Jira real do Pricing.
import { devs } from './devs';
import { sprints } from './sprints';
import { pullRequests } from './prs';
import { rng } from '../../shared/random';

export type DevSprintPoints = { committed: number; done: number; stories: number };

const prCount = new Map<string, number>();
for (const p of pullRequests) prCount.set(`${p.authorId}:${p.sprintId}`, (prCount.get(`${p.authorId}:${p.sprintId}`) ?? 0) + 1);

/** devPoints[devId][sprintId] */
export const devPoints: Record<string, Record<string, DevSprintPoints>> = {};

for (const d of devs) {
  const style = rng('pts-style:' + d.id);
  const ptsPerPr = style.float(0.6, 1.1); // estilo: pontos por PR (no Jira do Pricing, ~1,2 PR por ponto)
  const reliability = style.float(0.7, 1); // fração típica do comprometido que é entregue
  devPoints[d.id] = {};
  for (const s of sprints) {
    const prs = prCount.get(`${d.id}:${s.id}`) ?? 0;
    const r = rng(`pts:${d.id}:${s.id}`);
    const committed = prs ? Math.max(1, Math.round(prs * ptsPerPr + r.float(0, 1.5))) : r.bool(0.2) ? r.int(1, 3) : 0;
    const done = Math.min(committed, Math.round(committed * Math.min(1, reliability + r.float(-0.15, 0.15))));
    const stories = committed ? Math.max(1, Math.round(committed / r.float(2.5, 5))) : 0;
    devPoints[d.id][s.id] = { committed, done, stories };
  }
}
