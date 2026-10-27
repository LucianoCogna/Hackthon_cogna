// PRs SIMULADOS a partir do Jira real, enquanto o token do GitHub da organização não é aprovado.
// Mantém o mesmo contrato (GithubPrsResponse) que a integração real vai devolver.
//
// Regras:
// - cada história gera PRs do seu responsável real, dentro da sprint real, em quantidade
//   proporcional aos pontos (~1,2 PR por ponto: 8 pts ≈ 10 PRs);
// - histórias "A fazer" e canceladas não geram PR; "Em andamento" geram parte, com o último aberto;
// - a aderência ao Jira parte dos critérios reais da história (sem critérios, não há o que auditar);
// - cada dev tem um "estilo" fixo (% IA, velocidade de revisão, testes), sorteado pelo nome.
import type { GithubDev, GithubPr, GithubPrsResponse, JiraBoardResponse, JiraStory } from './types.js';
import { clamp, rng } from '../../shared/random.js';
import { criterionLabel, criterionStatuses } from '../../shared/criteriaAudit.js';

const DAY = 86_400_000;
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

export const devIdOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const slug = (s: string) => devIdOf(s).slice(0, 40);

/** "[Motor de Decisão EAD] Construir…" → "pricing-motor-de-decisao-ead"; sem prefixo → "pricing-engine". */
function repoOf(title: string) {
  const m = title.match(/^\s*\[([^\]]+)\]/);
  return m ? `pricing-${slug(m[1])}` : 'pricing-engine';
}

/** Dia útil k (0..9) a partir do início da sprint. */
function businessDay(start: string, k: number) {
  const d = Math.min(9, Math.max(0, k));
  return addDays(start, d < 5 ? d : d + 2);
}

type Style = { ai: number; review: number; tests: number; lines: number; assisted: boolean; ciFail: number };
function styleOf(name: string): Style {
  const r = rng('style:' + name);
  return {
    ai: r.float(45, 92), // % médio de código gerado por IA
    review: r.float(0.15, 1.4), // fator sobre o tempo de revisão esperado
    tests: r.float(0.35, 0.92), // chance de o PR incluir testes
    lines: r.float(0.7, 1.6), // tamanho relativo dos PRs
    assisted: r.bool(0.3), // usa revisão assistida por IA
    ciFail: r.float(0.02, 0.1),
  };
}

const PREFIXES = ['feat', 'feat', 'fix', 'refactor', 'test', 'chore'];
const CHORES = [
  'chore: atualiza dependências',
  'chore: ajusta pipeline de CI',
  'fix: corrige timeout na leitura do data mart',
  'docs: atualiza README do modelo',
  'refactor: extrai utilitário de datas',
];

function cleanTitle(t: string) {
  return t.replace(/^\s*\[[^\]]+\]\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 70).toLowerCase();
}

export function simulatePrs(board: JiraBoardResponse): GithubPrsResponse {
  const sprintById = new Map(board.sprints.map((s) => [s.id, s]));
  const people = [...new Set(board.stories.map((s) => s.assignee).filter((x): x is string => !!x))].sort();
  const repoNumbers = new Map<string, number>();
  const nextNumber = (repo: string) => {
    const n = (repoNumbers.get(repo) ?? 100 + (rng('repo:' + repo).int(0, 300))) + 1;
    repoNumbers.set(repo, n);
    return n;
  };

  const prs: GithubPr[] = [];
  const reviewersFor = (author: string, r: ReturnType<typeof rng>) => {
    const others = people.filter((p) => p !== author);
    if (!others.length) return [];
    const first = r.pick(others);
    const second = r.bool(0.35) ? r.pick(others.filter((o) => o !== first)) : undefined;
    return [devIdOf(first), ...(second ? [devIdOf(second)] : [])];
  };

  function makePr(opts: {
    story: JiraStory | null;
    author: string;
    sprintId: number;
    index: number;
    total: number;
    open: boolean;
    seed: string;
  }): GithubPr {
    const { story, author, sprintId, index, total, open, seed } = opts;
    const r = rng(seed);
    const st = styleOf(author);
    const sprint = sprintById.get(sprintId);
    const start = sprint?.start ?? board.sprints.at(-1)?.start ?? new Date().toISOString().slice(0, 10);
    const len = sprint?.end && sprint?.start ? Math.max(5, dayDiff(sprint.start, sprint.end)) : 13;
    const day = Math.round(((index + 0.5) / Math.max(1, total)) * 9 + r.float(-1, 1));
    const createdAt = businessDay(start, day);

    const dataHeavy = story ? /modelo|dados|data|ingest|master table|otimizador/i.test(story.title) : false;
    const size = Math.round(clamp(r.lognormalMean(170 * st.lines * (dataHeavy ? 1.5 : 1), 0.85), 6, 4200));
    const linesRemoved = Math.round(size * r.float(0.1, 0.4));
    const ai = Math.round(clamp(r.normal(st.ai, 9), 3, 99));
    const expected = Math.max(10, (size / 1000) * 30);
    const fast = ai >= 80 && st.review < 0.5;
    const reviewTimeMin = +clamp(r.lognormalMean(expected * st.review * (fast ? 0.35 : 1), 0.7), 0.3, 480).toFixed(1);
    const assisted = st.assisted && r.bool(0.8);
    const testsAdded = r.bool(st.tests);
    const suspicious = ai >= 80 && reviewTimeMin < expected * 0.2;

    let jiraAdherence: number | null = null;
    let adherenceNotes: string[] = ['PR sem história do Jira vinculada: não é possível auditar aderência'];
    if (story) {
      if (story.criteria.length) {
        jiraAdherence = Math.round(
          clamp(38 + 0.52 * story.specQuality + r.normal(0, 9) - (suspicious ? 16 : 0) + (assisted ? 5 : 0), 15, 100),
        );
        const statuses = criterionStatuses(story.key, story.criteria.length, jiraAdherence);
        adherenceNotes = [];
        statuses.forEach((s, i) => {
          const label = criterionLabel(story.criteria[i]);
          if (s === 'missing') adherenceNotes.push(`Critério ${i + 1} (${label}) não encontrado no diff`);
          if (s === 'partial') adherenceNotes.push(`Critério ${i + 1} (${label}) parcialmente atendido`);
        });
        if (!testsAdded && adherenceNotes.length) adherenceNotes.push('Nenhum teste cobre os critérios de aceite');
        if (!adherenceNotes.length) adherenceNotes.push('Todos os critérios de aceite foram encontrados no diff');
      } else {
        adherenceNotes = [
          story.criteriaTemplateUnfilled
            ? 'História com template de critérios não preenchido: não é possível auditar aderência'
            : 'História sem critérios de aceite: não é possível auditar aderência',
        ];
      }
    }

    const leadTimeH = +clamp(r.lognormalMean(fast ? 10 : 26, 0.6), 0.5, len * 24).toFixed(1);
    const mergedAt = open ? null : addDays(createdAt, Math.floor(leadTimeH / 24));
    const repo = story ? repoOf(story.title) : r.pick(['pricing-engine', ...[...repoNumbers.keys()].slice(0, 3)]);
    const number = nextNumber(repo);
    const prefix = index === 0 ? 'feat' : r.pick(PREFIXES);
    const title = story ? `${prefix}(${story.key}): ${cleanTitle(story.title)}` : r.pick(CHORES);

    return {
      id: `gh-${repo}-${number}`,
      number,
      repo,
      title,
      authorId: devIdOf(author),
      reviewerIds: reviewersFor(author, r),
      squadId: board.squadId,
      sprintId: String(sprintId),
      createdAt,
      mergedAt,
      linesAdded: size - linesRemoved,
      linesRemoved,
      filesChanged: Math.max(1, Math.round(size / 45 + r.float(0, 4))),
      aiGeneratedPct: ai,
      aiAssistedReview: assisted,
      reviewTimeMin,
      reviewComments: Math.max(0, Math.round(r.lognormalMean(0.6 + reviewTimeMin / 11, 0.6) - 0.5)),
      jiraKey: story?.key ?? null,
      jiraAdherence,
      adherenceNotes,
      testsAdded,
      testCoverageDelta: +(testsAdded ? r.float(0.2, 3.5) : r.float(-2, 0.3)).toFixed(1),
      ciStatus: r.bool(st.ciFail) ? 'failed' : 'passed',
      revertedOrHotfix: r.bool(0.025 + (suspicious ? 0.07 : 0) + (testsAdded ? 0 : 0.015)),
      leadTimeH,
      url: null,
    };
  }

  // PRs das histórias
  for (const story of board.stories) {
    if (story.statusCategory === 'To Do' || /cancel/i.test(story.status) || story.sprintId == null) continue;
    const r = rng('story:' + story.key);
    const author = story.assignee ?? (people.length ? r.pick(people) : 'Sem responsável');
    const base = story.points ?? r.int(1, 3);
    let total = clamp(Math.round(base * 1.2 + r.float(-1, 1.4)), 1, 12);
    const inProgress = story.statusCategory === 'In Progress';
    if (inProgress) total = Math.max(1, Math.round(total * 0.6));
    for (let k = 0; k < total; k++) {
      prs.push(
        makePr({ story, author, sprintId: story.sprintId, index: k, total, open: inProgress && k === total - 1, seed: `${story.key}:${k}` }),
      );
    }
  }

  // PRs sem história (chores) — cerca de 1 a cada 2 sprints por pessoa
  for (const sp of board.sprints) {
    for (const p of people) {
      const r = rng(`chore:${sp.id}:${p}`);
      if (r.bool(0.45)) prs.push(makePr({ story: null, author: p, sprintId: sp.id, index: r.int(0, 9), total: 10, open: false, seed: `chore:${sp.id}:${p}` }));
    }
  }

  prs.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.number - b.number);

  // Pontos reais do Jira por dev e sprint
  const devs = new Map<string, GithubDev>();
  for (const name of people) devs.set(devIdOf(name), { id: devIdOf(name), name, points: {} });
  for (const s of board.stories) {
    if (!s.assignee || s.sprintId == null) continue;
    const d = devs.get(devIdOf(s.assignee))!;
    const k = String(s.sprintId);
    d.points[k] ??= { committed: 0, done: 0, stories: 0 };
    d.points[k].stories++;
    d.points[k].committed += s.points ?? 0;
    if (s.statusCategory === 'Done' && !/cancel/i.test(s.status)) d.points[k].done += s.points ?? 0;
  }

  return {
    source: 'simulado',
    basedOn: 'jira',
    squadId: board.squadId,
    squadName: board.squadName,
    sprints: board.sprints,
    devs: [...devs.values()],
    prs,
    generatedAt: new Date().toISOString(),
  };
}
