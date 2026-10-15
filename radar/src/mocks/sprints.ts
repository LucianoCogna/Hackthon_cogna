import type { Sprint } from './types';

/** Início da Sprint 1 (segunda-feira). Altere aqui para deslocar toda a linha do tempo do mock. */
export const SPRINT_ORIGIN = '2025-08-04';
export const SPRINT_COUNT = 14;

const DAY = 86_400_000;
export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toISO(new Date(new Date(iso + 'T12:00:00Z').getTime() + n * DAY));

export const sprints: Sprint[] = Array.from({ length: SPRINT_COUNT }, (_, i) => {
  const start = addDays(SPRINT_ORIGIN, i * 14);
  return { id: `s${i + 1}`, index: i, name: `Sprint ${i + 1}`, start, end: addDays(start, 13) };
});

export const sprintById = Object.fromEntries(sprints.map((s) => [s.id, s])) as Record<string, Sprint>;

/** "Hoje" no universo do mock = penúltimo dia útil da última sprint. */
export const REF_DATE = addDays(sprints[sprints.length - 1].end, -2);

export function sprintOfDate(iso: string): Sprint | undefined {
  return sprints.find((s) => iso >= s.start && iso <= s.end);
}

export const shortSprint = (s: Sprint) => `S${s.index + 1}`;
