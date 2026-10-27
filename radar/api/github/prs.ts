// GET /api/github/prs?squad=pricing&sprints=6
// PRs do squad. Enquanto o token do GitHub da organização não é aprovado, os PRs são
// SIMULADOS a partir das histórias reais do Jira (source: 'simulado'). Quando o GitHub
// real entrar, este endpoint mantém o mesmo contrato com source: 'github'.
import { query, send, sendError, type Req, type Res } from '../_lib/jira.js';
import { boardParams, getJiraBoard } from '../_lib/jiraBoard.js';
import { simulatePrs } from '../_lib/githubSim.js';

export default async function handler(req: Req, res: Res) {
  try {
    const { squadId, sprintCount } = boardParams(query(req));
    const board = await getJiraBoard(squadId, sprintCount);
    send(res, 200, simulatePrs(board), 300);
  } catch (e) {
    sendError(res, e);
  }
}
