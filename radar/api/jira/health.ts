// GET /api/jira/health — confere credenciais, campo de critérios e acesso aos quadros (sem expor segredos).
import { SQUAD_BOARDS, acceptanceCriteriaField, jira, jiraBase, send, type Req, type Res } from '../_lib/jira.js';
import type { JiraHealthResponse } from '../_lib/types.js';

export default async function handler(_req: Req, res: Res) {
  const body: JiraHealthResponse = { ok: false, baseUrl: jiraBase(), criteriaField: null, boards: [] };
  try {
    const me = await jira<{ displayName: string }>('/rest/api/3/myself');
    body.user = me.displayName;
    body.criteriaField = await acceptanceCriteriaField();
    body.boards = await Promise.all(
      Object.entries(SQUAD_BOARDS).map(async ([squadId, b]) => {
        try {
          const info = await jira<{ name: string }>(`/rest/agile/1.0/board/${b.boardId}`);
          return { squadId, boardId: b.boardId, name: info.name, ok: true };
        } catch (e) {
          return { squadId, boardId: b.boardId, name: b.name, ok: false, error: (e as Error).message };
        }
      }),
    );
    body.ok = body.boards.every((b) => b.ok);
    send(res, 200, body);
  } catch (e) {
    send(res, (e as { status?: number }).status ?? 500, { ...body, error: (e as Error).message });
  }
}
