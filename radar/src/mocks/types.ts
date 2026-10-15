export type Squad = { id: string; name: string; techLead: string; color: string };

export type Seniority = 'Jr' | 'Pl' | 'Sr' | 'Esp';

export type Dev = {
  id: string;
  name: string;
  avatarSeed: string;
  squadId: string;
  seniority: Seniority;
  role: 'Dev' | 'Tech Lead';
  isMe?: boolean;
};

export type Sprint = { id: string; index: number; name: string; start: string; end: string };

export type Milestone = { id: string; label: string; date: string; description: string; sprintId: string };

export type PullRequest = {
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
  leadTimeH: number; // abertura → merge (horas)
};

export type StoryStatus = 'To Do' | 'In Progress' | 'Done';

export type Story = {
  key: string;
  title: string;
  squadId: string;
  sprintId: string;
  points: number;
  status: StoryStatus;
  acceptanceCriteria: string[];
  epicKey: string;
  specQuality: number;
  reopenCount: number;
};

export type KiroModel = 'Claude Haiku' | 'Claude Sonnet' | 'Claude Opus' | 'Claude Fable';
export type KiroTask =
  | 'commit'
  | 'explicar código'
  | 'gerar testes'
  | 'refatorar'
  | 'feature'
  | 'spec'
  | 'debug'
  | 'review';

export type KiroUsage = {
  devId: string;
  date: string;
  sprintId: string;
  model: KiroModel;
  taskType: KiroTask;
  calls: number; // registro agregado (chamadas no dia para esta tarefa/modelo)
  credits: number;
  tokensIn: number;
  tokensOut: number;
  accepted: boolean;
  usedSkill: string | null;
  specDriven: boolean;
};

export type EpicStatus = 'No prazo' | 'Atenção' | 'Atrasado' | 'Entregue';

export type Epic = {
  key: string;
  name: string;
  squadId: string;
  owner: string;
  status: EpicStatus;
  progressPct: number;
  plannedStart: string;
  plannedEnd: string;
  forecastEnd: string;
  risks: string[];
};
