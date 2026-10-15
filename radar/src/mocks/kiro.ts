import type { KiroModel, KiroTask, KiroUsage } from './types';
import { devs, devTraits } from './devs';
import { sprints, addDays, REF_DATE } from './sprints';
import { aiPhase } from './milestones';
import { createRng, clamp } from './seed';

export const MODELS: KiroModel[] = ['Claude Haiku', 'Claude Sonnet', 'Claude Opus', 'Claude Fable'];
export const TASKS: KiroTask[] = ['commit', 'explicar código', 'gerar testes', 'refatorar', 'feature', 'spec', 'debug', 'review'];

/** Créditos por chamada: base da tarefa × multiplicador do modelo. */
export const MODEL_MULT: Record<KiroModel, number> = {
  'Claude Haiku': 0.25,
  'Claude Sonnet': 1,
  'Claude Opus': 5,
  'Claude Fable': 11,
};
export const TASK_BASE: Record<KiroTask, number> = {
  commit: 0.4,
  'explicar código': 0.8,
  'gerar testes': 2.4,
  refatorar: 3,
  feature: 6,
  spec: 5,
  debug: 2.5,
  review: 3,
};
/** Valor do crédito em R$ (mock). */
export const CREDIT_BRL = 0.62;
/** Orçamento mensal de IA da VP Tech (R$, mock) — 8 squads. */
export const MONTHLY_BUDGET_BRL = 40000;

export const SKILLS = [
  'commit-conventional',
  'gerar-testes-jest',
  'steering-padroes-edu',
  'revisao-pr-checklist',
  'spec-template-ears',
  'lgpd-guard',
  'infra-terraform-mod',
];

const TRIVIAL: KiroTask[] = ['commit', 'explicar código'];

const rng = createRng(31337);

/** Sprint em que cada dev começou a usar o Kiro. */
export const kiroStart: Record<string, number> = {};
const neverActive = new Set(['academico-4', 'pricing-5', 'midia-1', 'financeiro-0']);
for (const d of devs) {
  const r = rng.next();
  kiroStart[d.id] = r < 0.1 ? rng.int(0, 3) : r < 0.55 ? rng.int(4, 6) : r < 0.92 ? rng.int(7, 9) : rng.int(10, 12);
  if (['plataforma-2', 'dados-1', 'financeiro-3'].includes(d.id)) kiroStart[d.id] = 2;
}

function chooseModel(task: KiroTask, waste: number): KiroModel {
  if (TRIVIAL.includes(task)) {
    const pOverkill = clamp(0.1 + waste * 1.25, 0, 0.95);
    if (rng.bool(pOverkill)) return rng.bool(0.72) ? 'Claude Opus' : 'Claude Fable';
    return rng.bool(0.8) ? 'Claude Haiku' : 'Claude Sonnet';
  }
  if (task === 'gerar testes' || task === 'refatorar' || task === 'debug') {
    return rng.weighted([
      ['Claude Haiku', 10],
      ['Claude Sonnet', 74 - waste * 40],
      ['Claude Opus', 14 + waste * 30],
      ['Claude Fable', 2 + waste * 10],
    ] as const);
  }
  return rng.weighted([
    ['Claude Sonnet', 56 - waste * 25],
    ['Claude Opus', 34],
    ['Claude Fable', 10 + waste * 25],
  ] as const);
}

export const kiroUsage: KiroUsage[] = [];

for (const sp of sprints) {
  const p = aiPhase(sp.index);
  for (const d of devs) {
    if (neverActive.has(d.id) && sp.index >= 10) continue;
    if (sp.index < kiroStart[d.id]) continue;
    const tr = devTraits[d.id];
    const maturity = clamp(0.35 + p * 0.65, 0, 1);
    for (let day = 0; day < 14; day++) {
      if (day % 7 >= 5) continue; // fim de semana
      const date = addDays(sp.start, day);
      if (date > REF_DATE) continue;
      if (!rng.bool(0.55 + 0.4 * maturity)) continue;
      const records = rng.int(2, 3 + Math.round(2 * p));
      for (let r = 0; r < records; r++) {
        const task = rng.weighted([
          ['commit', 26],
          ['explicar código', 18],
          ['gerar testes', 10 + 6 * tr.kiroSkill],
          ['refatorar', 9],
          ['feature', 14 + 6 * p],
          ['spec', 4 + 8 * p * tr.kiroSkill],
          ['debug', 10],
          ['review', 4 + 5 * p],
        ] as const);
        const model = chooseModel(task, tr.waste);
        const calls = task === 'commit' ? rng.int(2, 6) : rng.int(1, 4);
        const credits = +(TASK_BASE[task] * MODEL_MULT[model] * calls * rng.float(0.8, 1.25)).toFixed(2);
        const accepted = rng.bool(clamp(0.38 + 0.5 * tr.kiroSkill * maturity + 0.08, 0.2, 0.96));
        const usedSkill = rng.bool(clamp(0.05 + 0.65 * tr.kiroSkill * p, 0, 0.9))
          ? task === 'commit'
            ? 'commit-conventional'
            : task === 'gerar testes'
              ? 'gerar-testes-jest'
              : task === 'spec'
                ? 'spec-template-ears'
                : task === 'review'
                  ? 'revisao-pr-checklist'
                  : rng.pick(SKILLS)
          : null;
        const specDriven =
          (task === 'feature' || task === 'spec') && rng.bool(clamp(0.12 + 0.82 * tr.kiroSkill * p, 0, 0.96));
        const tokBase = TASK_BASE[task] * 1500 * calls;
        kiroUsage.push({
          devId: d.id,
          date,
          sprintId: sp.id,
          model,
          taskType: task,
          calls,
          credits,
          tokensIn: Math.round(tokBase * rng.float(0.8, 1.6)),
          tokensOut: Math.round(tokBase * 0.35 * rng.float(0.6, 1.4)),
          accepted,
          usedSkill,
          specDriven,
        });
      }
    }
  }
}

/** Tabela de roteamento: modelos adequados por tarefa (seção 5 da spec). */
export const ROUTING: Record<KiroTask, KiroModel[]> = {
  commit: ['Claude Haiku'],
  'explicar código': ['Claude Haiku'],
  'gerar testes': ['Claude Sonnet'],
  refatorar: ['Claude Sonnet'],
  debug: ['Claude Sonnet'],
  feature: ['Claude Sonnet', 'Claude Opus'],
  spec: ['Claude Sonnet', 'Claude Opus', 'Claude Fable'],
  review: ['Claude Sonnet', 'Claude Opus'],
};
export const RECOMMENDED: Record<KiroTask, KiroModel> = {
  commit: 'Claude Haiku',
  'explicar código': 'Claude Haiku',
  'gerar testes': 'Claude Sonnet',
  refatorar: 'Claude Sonnet',
  debug: 'Claude Sonnet',
  feature: 'Claude Sonnet',
  spec: 'Claude Opus',
  review: 'Claude Sonnet',
};
