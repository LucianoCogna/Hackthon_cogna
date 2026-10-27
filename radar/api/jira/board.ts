// GET /api/jira/board?squad=pricing&sprints=6
// Histórias e sprints reais de um quadro do Jira, no formato da aba GitHub × Jira.
import { query, send, sendError, type Req, type Res } from '../_lib/jira.js';
import { boardParams, getJiraBoard } from '../_lib/jiraBoard.js';
import { requireAccess } from '../_lib/auth.js';

export default async function handler(req: Req, res: Res) {
  try {
    requireAccess(req);
    const { squadId, sprintCount } = boardParams(query(req));
    send(res, 200, await getJiraBoard(squadId, sprintCount));
  } catch (e) {
    sendError(res, e);
  }
}
