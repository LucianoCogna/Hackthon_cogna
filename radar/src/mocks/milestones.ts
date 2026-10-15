import type { Milestone } from './types';
import { sprintOfDate } from './sprints';

const raw = [
  {
    id: 'devhub',
    label: 'Dev Hub',
    date: '2025-10-01',
    description: 'Lançamento do Dev Hub: portal único de engenharia, templates de repositório e primeiras licenças do Kiro.',
  },
  {
    id: 'aidlc',
    label: 'AI-DLC',
    date: '2025-12-01',
    description: 'Plataforma + AI-DLC: Kiro liberado para toda a VP Tech, fluxo spec-driven e skills corporativas.',
  },
];

export const milestones: Milestone[] = raw.map((m) => ({ ...m, sprintId: sprintOfDate(m.date)!.id }));

/** Fase de adoção de IA por índice de sprint: 0 = antes, ~0.2 = Dev Hub, 1 = AI-DLC pleno. */
export function aiPhase(sprintIndex: number) {
  const devhub = 4; // sprint que contém o Dev Hub
  const aidlc = 8; // sprint que contém o AI-DLC
  if (sprintIndex < devhub) return 0;
  if (sprintIndex < aidlc) return 0.12 + (sprintIndex - devhub) * 0.04;
  if (sprintIndex === aidlc) return 0.55;
  return Math.min(1, 0.8 + (sprintIndex - aidlc - 1) * 0.07);
}
