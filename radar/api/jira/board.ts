// GET /api/jira/board?squad=pricing&sprints=6
// Histórias e sprints reais de um quadro do Jira, no formato da aba GitHub × Jira.
import { query, send, sendError, type Req, type Res } from '../_lib/jira.js';
import { boardParams, getJiraBoard } from '../_lib/jiraBoard.js';

export default async function handler(req: Req, res: Res) {
  try {
    const { squadId, sprintCount } = boardParams(query(req));
    send(res, 200, await getJiraBoard(squadId, sprintCount), 300);
  } catch (e) {
    sendError(res, e);
  }
}
