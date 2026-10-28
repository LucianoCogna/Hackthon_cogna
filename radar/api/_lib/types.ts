// Contrato da API /api/jira/* (importado só como tipo pelo front-end).

export type JiraStatusCategory = 'To Do' | 'In Progress' | 'Done';

export type JiraSprint = {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  start: string | null;
  end: string | null;
  goal: string | null;
  stories: number;
  pointsCommitted: number;
  pointsDone: number;
  /** itens que estiveram na sprint (inclusive os que transbordaram para a seguinte) */
  items: JiraSprintItem[];
};

export type JiraSprintItem = {
  key: string;
  type: string;
  points: number;
  team: string | null;
  assignee: string | null;
  /** subtarefa: entra nos indicadores por tipo, mas não soma nos pontos da sprint (evita contar duas vezes) */
  subtask: boolean;
  /** data em que foi concluído dentro da sprint; null = não entregue nela */
  doneAt: string | null;
  cancelled: boolean;
};

export type JiraStory = {
  key: string;
  title: string;
  type: string;
  status: string;
  statusCategory: JiraStatusCategory;
  points: number | null;
  sprintId: number | null;
  sprintName: string | null;
  epicKey: string | null;
  epicName: string | null;
  assignee: string | null;
  labels: string[];
  /** frente do squad, pela label (ex.: Dev, Dados, DS no Pricing) */
  team: string | null;
  criteria: string[];
  /** de onde vieram os critérios: campo próprio do Jira, seção da descrição, ou não encontrados */
  criteriaSource: 'campo' | 'descrição' | null;
  /** a descrição tem o template de critérios, mas ninguém preencheu */
  criteriaTemplateUnfilled: boolean;
  /** 0–100, heurística determinística (sem LLM) */
  specQuality: number;
  /** quantas vezes saiu de um status "concluído" e voltou para o fluxo */
  reopenCount: number;
  created: string;
  resolved: string | null;
  url: string;
};

export type JiraBoardResponse = {
  source: 'jira';
  squadId: string;
  squadName: string;
  boardId: number;
  boardName: string;
  criteriaField: { id: string; name: string } | null;
  /** frentes do squad, na ordem de exibição */
  teams: string[];
  sprints: JiraSprint[];
  stories: JiraStory[];
  generatedAt: string;
};

export type JiraHealthResponse = {
  ok: boolean;
  user?: string;
  baseUrl: string;
  criteriaField: { id: string; name: string } | null;
  boards: { squadId: string; boardId: number; name: string; ok: boolean; error?: string }[];
  error?: string;
};

// ---------------------------------------------------------------------------
// /api/github/* — mesmo formato de PR usado pelas abas (src/mocks/types.ts › PullRequest)
// ---------------------------------------------------------------------------
export type GithubPr = {
  id: string;
  number: number;
  repo: string;
  title: string;
  authorId: string;
  reviewerIds: string[];
  squadId: string;
  sprintId: string;
  createdAt: string;
  mergedAt: string | null;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  aiGeneratedPct: number;
  aiAssistedReview: boolean;
  reviewTimeMin: number;
  reviewComments: number;
  jiraKey: string | null;
  jiraAdherence: number | null;
  adherenceNotes: string[];
  testsAdded: boolean;
  testCoverageDelta: number;
  ciStatus: 'passed' | 'failed';
  revertedOrHotfix: boolean;
  leadTimeH: number;
  url: string | null;
};

export type GithubDev = {
  id: string;
  name: string;
  /** pontos do Jira por sprint (id da sprint → comprometidos/entregues) */
  points: Record<string, { committed: number; done: number; stories: number }>;
};

export type GithubPrsResponse = {
  /** 'simulado' enquanto o token do GitHub não é aprovado; 'github' quando vier da API real */
  source: 'simulado' | 'github';
  basedOn: 'jira';
  squadId: string;
  squadName: string;
  sprints: JiraSprint[];
  devs: GithubDev[];
  prs: GithubPr[];
  generatedAt: string;
};
