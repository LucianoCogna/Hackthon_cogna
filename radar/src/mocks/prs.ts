import type { PullRequest, Story } from './types';
import { devs, devTraits } from './devs';
import { squadProfile, squadRepos } from './squads';
import { sprints, addDays, REF_DATE } from './sprints';
import { aiPhase } from './milestones';
import { stories, criteriaTags, criterionStatuses, HERO_STORY_KEY } from './stories';
import { createRng, clamp } from './seed';

const rng = createRng(90210);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const genericTitles = [
  'chore: atualiza dependências',
  'fix: ajusta timeout de integração',
  'refactor: extrai serviço de validação',
  'chore: ajusta pipeline de CI',
  'fix: corrige typo em mensagem de erro',
  'docs: atualiza README',
  'chore: remove código morto',
];
const prefixes = ['feat', 'feat', 'feat', 'fix', 'refactor'];

const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .slice(0, 5)
    .join(' ');

function businessDay(start: string, offset: number) {
  // pula fins de semana: dias 0–4 e 7–11 da sprint
  const d = offset < 5 ? offset : offset + 2;
  return addDays(start, Math.min(d, 11));
}

export function buildNotes(story: Story | undefined, adherence: number | null, testsAdded: boolean, size: number) {
  if (!story || adherence === null) return ['PR sem história do Jira vinculada: não é possível auditar aderência'];
  const tags = criteriaTags[story.key] ?? [];
  const st = criterionStatuses(story.key, story.acceptanceCriteria.length, adherence);
  const notes: string[] = [];
  st.forEach((s, i) => {
    if (s === 'missing') notes.push(`Critério ${i + 1} (${tags[i]}) não encontrado no diff`);
    if (s === 'partial') notes.push(`Critério ${i + 1} (${tags[i]}) parcialmente atendido`);
  });
  if (adherence < 50) notes.push(`Diff altera ${Math.max(3, Math.round(size / 220))} arquivos fora do escopo da história`);
  if (!testsAdded && notes.length) notes.push('Nenhum teste cobre os critérios de aceite');
  if (!notes.length) notes.push('Todos os critérios de aceite foram encontrados no diff');
  return notes;
}

export const pullRequests: PullRequest[] = [];
let prNumber = 1200;

for (const sp of sprints) {
  const p = aiPhase(sp.index);
  for (const dev of devs) {
    const tr = devTraits[dev.id];
    const prof = squadProfile[dev.squadId];
    const squadStories = stories.filter((s) => s.squadId === dev.squadId && s.sprintId === sp.id);
    const mates = devs.filter((d) => d.squadId === dev.squadId && d.id !== dev.id);
    const count = Math.max(0, Math.round(lerp(2.4, 4.2, p) * tr.output + rng.float(-1.2, 1.2)));

    for (let k = 0; k < count; k++) {
      // --- tamanho
      const meanLines = lerp(180, 640, p) * (1 + prof.aiBias * 1.6 * p);
      const size = Math.round(clamp(rng.lognormalMean(meanLines, lerp(0.7, 1.05, p)), 6, 6400));
      const removedFrac = rng.float(0.12, 0.42);
      const linesRemoved = Math.round(size * removedFrac);
      const linesAdded = size - linesRemoved;

      // --- % IA
      const aiPct =
        p < 0.1
          ? clamp(Math.round(rng.normal(7, 6)), 0, 20)
          : Math.round(clamp(rng.normal(lerp(8, 76, p) + prof.aiBias * 110 * p + tr.aiAffinity * 45 * p, 9), 0, 96));

      // --- revisão
      const assisted = p >= 0.5 ? rng.bool(prof.assistedReview ? 0.86 : 0.07) : p > 0 && rng.bool(0.02);
      let reviewMean: number;
      let sigma: number;
      if (prof.fastReview) [reviewMean, sigma] = [lerp(45, 2.6, p), lerp(0.6, 1.15, p)];
      else if (assisted) [reviewMean, sigma] = [lerp(45, 9.5, p), 0.55];
      else [reviewMean, sigma] = [lerp(45, 15, p), lerp(0.6, 0.9, p)];
      const sizeFactor = p < 0.5 ? 0.55 + size / 400 : 0.85 + size / 4000;
      const reviewTimeMin = +clamp(rng.lognormalMean(reviewMean * sizeFactor, sigma), 0.2, 480).toFixed(1);
      const reviewComments = Math.max(0, Math.round(rng.lognormalMean(0.6 + reviewTimeMin / 11, 0.6) - 0.5));

      // --- Jira
      const linked = squadStories.length > 0 && rng.bool(lerp(0.9, 0.86, p));
      const story = linked
        ? rng.bool(0.55)
          ? squadStories[Math.floor(rng.next() * Math.min(3, squadStories.length))]
          : rng.pick(squadStories)
        : undefined;
      let adherence: number | null = null;
      if (story && story.key !== HERO_STORY_KEY) {
        const base = 32 + 0.62 * story.specQuality + rng.normal(0, 8);
        const penalty = prof.fastReview ? 14 * p : 0;
        const bonus = assisted ? 6 : 0;
        adherence = Math.round(clamp(base - penalty + bonus, 30, 100));
      }
      const storyRef = story && story.key !== HERO_STORY_KEY ? story : undefined;

      // --- testes e qualidade
      const pTests = p < 0.5 ? 0.62 : prof.assistedReview ? 0.88 : prof.fastReview ? 0.38 : 0.6;
      const testsAdded = rng.bool(clamp(pTests + (tr.kiroSkill - 0.6) * 0.2, 0.05, 0.97));
      const testCoverageDelta = +(testsAdded ? rng.float(0.2, 3.6) : rng.float(-2.2, 0.3)).toFixed(1);
      const ciStatus = rng.bool(0.06) ? 'failed' : 'passed';
      const expected = Math.max(10, (size / 1000) * 30);
      const suspicious = aiPct >= 70 && reviewTimeMin / expected < 0.2;
      let pBug = 0.035;
      if (p >= 0.5) {
        if (prof.fastReview) pBug = 0.04 + 0.12 * p * (suspicious ? 1 : 0.45);
        else if (assisted) pBug = 0.022;
        else pBug = 0.03;
      }
      if (!testsAdded) pBug += 0.015;
      const revertedOrHotfix = rng.bool(pBug);

      // --- datas
      const createdAt = businessDay(sp.start, rng.int(0, 9));
      const leadTimeH = +clamp(rng.lognormalMean(lerp(54, prof.fastReview ? 15 : 21, p), 0.55), 1.5, 260).toFixed(1);
      const mergedDate = addDays(createdAt, Math.floor(leadTimeH / 24));
      const mergedAt = mergedDate > REF_DATE ? null : mergedDate;

      const repos = squadRepos[dev.squadId];
      const title = storyRef
        ? `${rng.pick(prefixes)}: ${slug(storyRef.title)}`
        : genericTitles[Math.floor(rng.next() * genericTitles.length)];

      pullRequests.push({
        id: `pr-${prNumber}`,
        number: prNumber++,
        repo: rng.pick(repos),
        title,
        authorId: dev.id,
        reviewerIds: mates.length ? [rng.pick(mates).id, ...(rng.bool(0.35) ? [rng.pick(mates).id] : [])] : [],
        squadId: dev.squadId,
        sprintId: sp.id,
        createdAt,
        mergedAt,
        linesAdded,
        linesRemoved,
        filesChanged: Math.max(1, Math.round(size / 45 + rng.float(0, 4))),
        aiGeneratedPct: aiPct,
        aiAssistedReview: assisted,
        reviewTimeMin,
        reviewComments,
        jiraKey: storyRef?.key ?? null,
        jiraAdherence: adherence,
        adherenceNotes: buildNotes(storyRef, adherence, testsAdded, size),
        testsAdded,
        testCoverageDelta,
        ciStatus,
        revertedOrHotfix,
        leadTimeH,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// PR-herói da demo: "99% IA, aprovado em 30 segundos e não bate com o card do Jira."
// ---------------------------------------------------------------------------
const last = sprints[sprints.length - 1];
const heroStory = stories.find((s) => s.key === HERO_STORY_KEY)!;
export const HERO_PR_NUMBER = 4821;
export const heroPr: PullRequest = {
  id: 'pr-hero',
  number: HERO_PR_NUMBER,
  repo: 'vendas-checkout-api',
  title: 'feat(checkout): novo fluxo de cupom e pagamento',
  authorId: 'vendas-2',
  reviewerIds: ['vendas-4'],
  squadId: 'vendas',
  sprintId: last.id,
  createdAt: businessDay(last.start, 8),
  mergedAt: businessDay(last.start, 8),
  linesAdded: 2640,
  linesRemoved: 212,
  filesChanged: 38,
  aiGeneratedPct: 99,
  aiAssistedReview: false,
  reviewTimeMin: 0.5,
  reviewComments: 0,
  jiraKey: HERO_STORY_KEY,
  jiraAdherence: 22,
  adherenceNotes: [
    ...buildNotes(heroStory, 22, false, 2852).filter((n) => !n.startsWith('Diff')),
    'Diff altera 11 arquivos fora do escopo da história (módulo de frete e e-mails transacionais)',
  ],
  testsAdded: false,
  testCoverageDelta: -3.4,
  ciStatus: 'passed',
  revertedOrHotfix: false,
  leadTimeH: 0.4,
};
pullRequests.push(heroPr);

// Um PR complementar do mesmo card, que entrega parte do escopo
pullRequests.push({
  ...heroPr,
  id: 'pr-hero-2',
  number: HERO_PR_NUMBER + 7,
  title: 'feat(checkout): aplica cupom no resumo do pedido',
  authorId: 'vendas-3',
  reviewerIds: ['vendas-0'],
  linesAdded: 186,
  linesRemoved: 40,
  filesChanged: 6,
  aiGeneratedPct: 72,
  reviewTimeMin: 14,
  reviewComments: 3,
  jiraAdherence: 58,
  adherenceNotes: buildNotes(heroStory, 58, true, 226),
  testsAdded: true,
  testCoverageDelta: 1.2,
  createdAt: businessDay(last.start, 9),
  mergedAt: null,
  leadTimeH: 20,
});

export const prById = Object.fromEntries(pullRequests.map((p) => [p.id, p])) as Record<string, PullRequest>;
