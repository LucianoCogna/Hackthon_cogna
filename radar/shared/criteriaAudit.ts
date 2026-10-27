// Auditoria simulada critério a critério. Código compartilhado entre o front-end e as funções de api/
// (fica fora de api/ porque o navegador também importa este módulo).
// Cada critério recebe um deslocamento fixo por história; aplicado sobre a aderência do PR,
// diz se o critério foi atendido, atendido em parte ou não encontrado no diff.
import { hashString } from './random.js';

export type CriterionStatus = 'ok' | 'partial' | 'missing';

export function criterionStatuses(storyKey: string, n: number, adherence: number): CriterionStatus[] {
  return Array.from({ length: n }, (_, i) => {
    const offset = ((hashString(storyKey + ':' + i) % 1000) / 1000) * 64 - 26;
    const s = adherence + offset;
    return s >= 75 ? 'ok' : s >= 52 ? 'partial' : 'missing';
  });
}

/** Status consolidado da história: o melhor resultado de cada critério entre os PRs vinculados. */
export function consolidatedStatuses(storyKey: string, n: number, adherences: number[]): CriterionStatus[] {
  const rank: Record<CriterionStatus, number> = { missing: 0, partial: 1, ok: 2 };
  return Array.from({ length: n }, (_, i) =>
    adherences.reduce<CriterionStatus>((best, a) => {
      const s = criterionStatuses(storyKey, n, a)[i];
      return rank[s] > rank[best] ? s : best;
    }, 'missing'),
  );
}

/** Rótulo curto de um critério para as notas ("CA02 - Cálculo do gap…" → "CA02 - Cálculo do gap"). */
export function criterionLabel(text: string) {
  const head = text.split(/:\s/)[0];
  return (head.length <= 60 ? head : text.slice(0, 57) + '…').trim();
}
