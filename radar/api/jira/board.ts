// GET /api/jira/board?squad=pricing&sprints=6
// Histórias e sprints reais de um quadro do Jira, no formato da aba GitHub × Jira.
import {
  EPIC_LINK_FIELD,
  JiraError,
  SPRINT_FIELD,
  SP_FIELD,
  SQUAD_BOARDS,
  TEMPLATE_HINT,
  acceptanceCriteriaField,
  adfToText,
  contextLength,
  cached,
  criteriaFromDescription,
  criteriaFromField,
  jira,
  jiraBase,
  query,
  send,
  sendError,
  specQualityHeuristic,
  statusCategories,
  type Req,
  type Res,
} from '../_lib/jira.js';
import type { JiraBoardResponse, JiraSprint, JiraStatusCategory, JiraStory } from '../_lib/types.js';

type RawSprint = { id: number; name: string; state: string; startDate?: string; endDate?: string; completeDate?: string; goal?: string };
type RawIssue = {
  key: string;
  fields: Record<string, any>;
  changelog?: { histories?: { created?: string; items: { field: string; fromString?: string; toString?: string }[] }[] };
};

const CACHE_MS = 5 * 60_000;

async function boardSprints(boardId: number, count: number): Promise<RawSprint[]> {
  const closed: RawSprint[] = [];
  for (let startAt = 0, page = 0; page < 20; page++) {
    const r = await jira<{ values: RawSprint[]; isLast: boolean }>(
      `/rest/agile/1.0/board/${boardId}/sprint?state=closed&maxResults=50&startAt=${startAt}`,
    );
    closed.push(...(r.values ?? []));
    if (r.isLast || !r.values?.length) break;
    startAt += r.values.length;
  }
  const active = (await jira<{ values: RawSprint[] }>(`/rest/agile/1.0/board/${boardId}/sprint?state=active`)).values ?? [];
  closed.sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
  return [...closed.slice(-Math.max(0, count - active.length)), ...active];
}

async function sprintIssues(boardId: number, sprintId: number, fields: string[]): Promise<RawIssue[]> {
  const all: RawIssue[] = [];
  for (let startAt = 0, page = 0; page < 10; page++) {
    const r = await jira<{ issues: RawIssue[]; total: number }>(
      `/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue?maxResults=100&startAt=${startAt}&expand=changelog&fields=${fields.join(',')}`,
    );
    all.push(...(r.issues ?? []));
    if (!r.issues?.length || startAt + r.issues.length >= (r.total ?? 0)) break;
    startAt += r.issues.length;
  }
  return all;
}

const isCancelled = (status: string | undefined) => /cancel/i.test(status ?? '');

/** Data (AAAA-MM-DD) da última vez que o item entrou num status concluído; fallback: data de resolução. */
function doneAt(issue: RawIssue, statusCat: Record<string, string>): string | null {
  let last: string | null = null;
  for (const h of issue.changelog?.histories ?? []) {
    for (const it of h.items) {
      if (it.field === 'status' && statusCat[(it.toString ?? '').toLowerCase()] === 'done' && h.created) {
        const d = h.created.slice(0, 10);
        if (!last || d > last) last = d;
      }
    }
  }
  return last ?? (issue.fields.resolutiondate ? String(issue.fields.resolutiondate).slice(0, 10) : null);
}

const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);

const toCategory = (key: string | undefined): JiraStatusCategory =>
  key === 'done' ? 'Done' : key === 'indeterminate' ? 'In Progress' : 'To Do';

async function buildBoard(squadId: string, sprintCount: number): Promise<JiraBoardResponse> {
  const cfg = SQUAD_BOARDS[squadId];
  const base = jiraBase();
  const [board, acField, statusCat] = await Promise.all([
    jira<{ name: string }>(`/rest/agile/1.0/board/${cfg.boardId}`),
    acceptanceCriteriaField(),
    statusCategories(),
  ]);

  const fields = [
    'summary', 'issuetype', 'status', 'assignee', 'created', 'resolutiondate', 'description', 'parent',
    SP_FIELD, EPIC_LINK_FIELD, SPRINT_FIELD, ...(acField ? [acField.id] : []),
  ];
  const sprints = await boardSprints(cfg.boardId, sprintCount);
  const perSprint = await Promise.all(sprints.map((s) => sprintIssues(cfg.boardId, s.id, fields)));

  // Uma história pode passar por várias sprints (transbordo): fica na mais recente.
  const lastSprintOf = new Map<string, { sprint: RawSprint; issue: RawIssue }>();
  perSprint.forEach((issues, i) =>
    issues.forEach((issue) => lastSprintOf.set(issue.key, { sprint: sprints[i], issue })),
  );

  const isStory = (f: Record<string, any>) => !f.issuetype?.subtask && !/^(epic|épico)$/i.test(f.issuetype?.name ?? '');

  const stories: JiraStory[] = [];
  for (const { sprint, issue } of lastSprintOf.values()) {
    const f = issue.fields;
    if (!isStory(f)) continue;
    const fieldCriteria = acField ? criteriaFromField(f[acField.id]) : [];
    const descCriteria = fieldCriteria.length ? [] : criteriaFromDescription(f.description);
    const criteria = fieldCriteria.length ? fieldCriteria : descCriteria;
    const parentIsEpic = /^(epic|épico)$/i.test(f.parent?.fields?.issuetype?.name ?? '');
    const epicKey: string | null = (parentIsEpic ? f.parent?.key : null) ?? f[EPIC_LINK_FIELD] ?? null;
    const points = typeof f[SP_FIELD] === 'number' ? f[SP_FIELD] : null;

    let reopenCount = 0;
    for (const h of issue.changelog?.histories ?? []) {
      for (const it of h.items) {
        if (it.field !== 'status') continue;
        const from = statusCat[(it.fromString ?? '').toLowerCase()];
        const to = statusCat[(it.toString ?? '').toLowerCase()];
        if (from === 'done' && to && to !== 'done') reopenCount++;
      }
    }

    stories.push({
      key: issue.key,
      title: f.summary ?? '',
      type: f.issuetype?.name ?? '',
      status: f.status?.name ?? '',
      statusCategory: toCategory(f.status?.statusCategory?.key),
      points,
      sprintId: sprint.id,
      sprintName: sprint.name,
      epicKey,
      epicName: parentIsEpic ? (f.parent?.fields?.summary ?? null) : null,
      assignee: f.assignee?.displayName ?? null,
      criteria,
      criteriaSource: fieldCriteria.length ? 'campo' : descCriteria.length ? 'descrição' : null,
      criteriaTemplateUnfilled: criteria.length === 0 && TEMPLATE_HINT.test(adfToText(f.description)),
      specQuality: specQualityHeuristic({
        criteria,
        descriptionLength: contextLength(f.description),
        hasPoints: points !== null,
        hasEpic: !!epicKey,
      }),
      reopenCount,
      created: (f.created ?? '').slice(0, 10),
      resolved: f.status?.statusCategory?.key === 'done' ? doneAt(issue, statusCat) : null,
      url: `${base}/browse/${issue.key}`,
    });
  }

  const sprintList: JiraSprint[] = sprints.map((s, i) => {
    const issues = perSprint[i].filter((x) => isStory(x.fields));
    const end = (s.completeDate ?? s.endDate ?? '').slice(0, 10);
    const start = (s.startDate ?? '').slice(0, 10);
    const pts = (x: RawIssue) => (typeof x.fields[SP_FIELD] === 'number' ? x.fields[SP_FIELD] : 0);
    // entregue na sprint = concluído (não cancelado) entre o início e o fechamento da sprint (+1 dia de tolerância)
    const doneInSprint = (x: RawIssue) => {
      if (x.fields.status?.statusCategory?.key !== 'done' || isCancelled(x.fields.status?.name)) return false;
      const d = doneAt(x, statusCat);
      if (!d) return false;
      return (!start || d >= start) && (s.state === 'active' || !end || d <= addDays(end, 1));
    };
    return {
      id: s.id,
      name: s.name,
      state: s.state as JiraSprint['state'],
      start: start || null,
      end: (s.endDate ?? '').slice(0, 10) || null,
      goal: s.goal || null,
      stories: issues.length,
      pointsCommitted: issues.reduce((a, x) => a + pts(x), 0),
      pointsDone: issues.filter(doneInSprint).reduce((a, x) => a + pts(x), 0),
    };
  });

  stories.sort((a, b) => (b.sprintId ?? 0) - (a.sprintId ?? 0) || a.key.localeCompare(b.key, undefined, { numeric: true }));

  return {
    source: 'jira',
    squadId,
    squadName: cfg.name,
    boardId: cfg.boardId,
    boardName: board.name,
    criteriaField: acField,
    sprints: sprintList,
    stories,
    generatedAt: new Date().toISOString(),
  };
}

export default async function handler(req: Req, res: Res) {
  try {
    const q = query(req);
    const squadId = q.get('squad') ?? 'pricing';
    const sprintCount = Math.min(12, Math.max(1, Number(q.get('sprints') ?? 6) || 6));
    if (!SQUAD_BOARDS[squadId]) {
      throw new JiraError(`Squad "${squadId}" ainda não está ligado ao Jira. Disponíveis: ${Object.keys(SQUAD_BOARDS).join(', ')}`, 400);
    }
    const data = await cached(`board:${squadId}:${sprintCount}`, CACHE_MS, () => buildBoard(squadId, sprintCount));
    send(res, 200, data, 300);
  } catch (e) {
    sendError(res, e);
  }
}
