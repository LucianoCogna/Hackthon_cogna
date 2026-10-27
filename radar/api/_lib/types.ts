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
  criteria: string[];
  /** de onde vieram os critérios: campo próprio do Jira, seção da descrição, ou não encontrados */
  criteriaSource: 'campo' | 'descrição' | null;
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
