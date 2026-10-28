// Quadro de sprints simulado, no mesmo formato do Jira (JiraSprint), para os indicadores da aba
// GitHub × Jira sem conectar ao Jira. Parte das histórias simuladas, com tipos de item, subtarefas,
// responsáveis e datas de conclusão; uma fração fecha fora da sprint (transbordo), como no Jira real.
import type { JiraSprint, JiraSprintItem } from '../../api/_lib/types';
import { rng } from '../../shared/random';
import { devs } from './devs';
import { sprints, addDays, REF_DATE } from './sprints';
import { stories } from './stories';

const TYPES: [string, number][] = [
  ['História', 68],
  ['Débito Técnico', 9],
  ['Enabler', 8],
  ['Spike', 6],
  ['Bug', 5],
  ['Teste', 4],
];

function pickType(r: ReturnType<typeof rng>) {
  let x = r.float(0, 100);
  for (const [t, w] of TYPES) if ((x -= w) < 0) return t;
  return TYPES[0][0];
}

/** Dia útil k (0..9) da sprint, sem passar do "hoje" do mock. */
function businessDay(start: string, k: number) {
  const d = Math.min(9, Math.max(0, k));
  const iso = addDays(start, d < 5 ? d : d + 2);
  return iso > REF_DATE ? REF_DATE : iso;
}

/** Sprints simuladas (as `count` mais recentes) com os itens dos squads aceitos por `inSquad`. */
export function mockJiraSprints(inSquad: (squadId: string) => boolean, count: number): JiraSprint[] {
  const last = sprints[sprints.length - 1];
  return sprints.slice(-count).map((s) => {
    const active = s.id === last.id;
    const items: JiraSprintItem[] = [];
    for (const st of stories) {
      if (st.sprintId !== s.id || !inSquad(st.squadId)) continue;
      const r = rng('jira-item:' + st.key);
      const squadDevs = devs.filter((d) => d.squadId === st.squadId);
      const assignee = squadDevs.length ? r.pick(squadDevs).name : null;
      const spill = rng('spill:' + st.squadId).float(0.06, 0.24); // cada squad tem seu nível de transbordo
      const cancelled = r.bool(0.02);
      const doneInSprint = !cancelled && st.status === 'Done' && (active || !r.bool(spill));
      const doneAt = doneInSprint ? businessDay(s.start, r.int(2, 9)) : null;
      items.push({ key: st.key, type: pickType(r), points: st.points, team: null, assignee, subtask: false, doneAt, cancelled });

      // subtarefas: sem pontos, do mesmo responsável na maior parte das vezes
      const subs = r.int(2, 7);
      for (let i = 0; i < subs; i++) {
        const sr = rng(`jira-sub:${st.key}:${i}`);
        const subDone = doneInSprint ? sr.bool(0.95) : st.status !== 'To Do' && sr.bool(0.45);
        items.push({
          key: `${st.key}-${i + 1}`,
          type: sr.bool(0.06) ? 'Sub-bug' : 'Subtarefa',
          points: 0,
          team: null,
          assignee: sr.bool(0.75) || !squadDevs.length ? assignee : sr.pick(squadDevs).name,
          subtask: true,
          doneAt: subDone ? businessDay(s.start, sr.int(1, 9)) : null,
          cancelled: false,
        });
      }
    }
    const pointItems = items.filter((i) => !i.subtask && !i.cancelled);
    return {
      id: s.index + 1,
      name: s.name,
      state: active ? 'active' : 'closed',
      start: s.start,
      end: s.end,
      goal: null,
      stories: pointItems.length,
      pointsCommitted: pointItems.reduce((a, i) => a + i.points, 0),
      pointsDone: pointItems.filter((i) => i.doneAt).reduce((a, i) => a + i.points, 0),
      items,
    };
  });
}
