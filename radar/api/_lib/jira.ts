// Cliente do Jira Cloud usado pelas Vercel Functions (só roda no servidor: o token nunca vai para o navegador).
// Mesmo padrão do dpos_hub: Basic auth (e-mail + API token), POST /rest/api/3/search/jql e API Agile.

import type { IncomingMessage, ServerResponse } from 'node:http';

export class JiraError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

export const SP_FIELD = 'customfield_10026'; // story points
export const SPRINT_FIELD = 'customfield_10020';
export const EPIC_LINK_FIELD = 'customfield_10014';

/** Quadros do Jira por squad do RADAR. Por enquanto, só Pricing (exemplo). */
export const SQUAD_BOARDS: Record<string, { boardId: number; name: string }> = {
  pricing: { boardId: 8075, name: 'Pricing' },
};

function config() {
  const user = process.env.JIRA_EMAIL || process.env.JIRA_USERNAME;
  const token = process.env.JIRA_TOKEN;
  if (!user || !token) {
    throw new JiraError('Credenciais do Jira ausentes. Defina JIRA_USERNAME (ou JIRA_EMAIL) e JIRA_TOKEN.', 500);
  }
  return {
    base: (process.env.JIRA_BASE_URL || 'https://cogna.atlassian.net').replace(/\/$/, ''),
    auth: 'Basic ' + Buffer.from(`${user}:${token}`).toString('base64'),
  };
}

export const jiraBase = () => (process.env.JIRA_BASE_URL || 'https://cogna.atlassian.net').replace(/\/$/, '');

export async function jira<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { base, auth } = config();
  const res = await fetch(base + path, {
    method: init.method ?? 'GET',
    headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    if (res.status === 401) throw new JiraError('Jira recusou as credenciais (401). Verifique o e-mail e o API token.', 401);
    if (res.status === 403) throw new JiraError('Sem permissão no Jira (403) para: ' + path, 403);
    if (res.status === 404) throw new JiraError('Não encontrado no Jira (404): ' + path, 404);
    throw new JiraError(`Erro ${res.status} do Jira em ${path}: ${text}`, 502);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Cache em memória por instância da função (o CDN da Vercel também cacheia via Cache-Control)
// ---------------------------------------------------------------------------
const cache = new Map<string, { at: number; value: unknown }>();
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ---------------------------------------------------------------------------
// Helpers de domínio
// ---------------------------------------------------------------------------

/** Descobre o campo de critérios de aceite pelo nome (ou usa JIRA_AC_FIELD, se definido). */
export async function acceptanceCriteriaField(): Promise<{ id: string; name: string } | null> {
  return cached('ac-field', 60 * 60_000, async () => {
    const fields = await jira<{ id: string; name: string }[]>('/rest/api/3/field');
    const forced = process.env.JIRA_AC_FIELD;
    if (forced) return fields.find((f) => f.id === forced) ?? { id: forced, name: forced };
    const rank = (n: string) =>
      /crit[ée]rios? de aceit/i.test(n) ? 3 : /acceptance criteria/i.test(n) ? 2 : /aceite|acceptance/i.test(n) ? 1 : 0;
    const best = fields.map((f) => ({ f, r: rank(f.name) })).filter((x) => x.r > 0).sort((a, b) => b.r - a.r)[0];
    return best ? { id: best.f.id, name: best.f.name } : null;
  });
}

/** Categoria de cada status (para detectar reabertura: sair de "done" para outro status). */
export async function statusCategories(): Promise<Record<string, string>> {
  return cached('status-cat', 60 * 60_000, async () => {
    const list = await jira<{ name: string; statusCategory?: { key: string } }[]>('/rest/api/3/status');
    return Object.fromEntries(list.map((s) => [s.name.toLowerCase(), s.statusCategory?.key ?? '']));
  });
}

// ---------------------------------------------------------------------------
// ADF (Atlassian Document Format) → texto e critérios
// ---------------------------------------------------------------------------
type Adf = { type?: string; text?: string; content?: Adf[]; attrs?: Record<string, unknown> };

const BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote', 'panel', 'tableRow']);

export function adfToText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  const n = node as Adf;
  if (n.type === 'text') return n.text ?? '';
  if (n.type === 'hardBreak') return '\n';
  const inner = (n.content ?? []).map(adfToText).join('');
  return BLOCKS.has(n.type ?? '') ? inner.trim() + '\n' : inner;
}

// ---------------------------------------------------------------------------
// Critérios de aceite a partir de texto. A API Agile devolve wiki markup do Jira
// ("h3. CA01", "*Dado que*", "# item"); a API v3 devolve ADF (convertido antes em texto).
// ---------------------------------------------------------------------------
const AC_HEADING = /crit[ée]rios? de aceit|acceptance criteria|^aceite\b/i;
// Seções que encerram os critérios (inclui o bloco de DoR do template: "[Condição mínima para iniciar]")
const STOP_HEADING =
  /^(\[?condi[çc][ãa]o m[íi]nima|dor\b|dod\b|definition of (ready|done)|crit[ée]rios? de pronto|defini[çc][ãa]o de pronto|pr[ée]-?requisitos|observa[çc][õo]es|notas?\b|fora de escopo|premissas?|depend[êe]ncias|riscos?\b|anexos?|refer[êe]ncias|regras de neg[óo]cio|links?\b|evid[êe]ncias)/i;
const SEPARATOR = /^[-=_*~]{3,}$/;
/** Instruções do template de história que ninguém preencheu (não são critérios). */
export const TEMPLATE_HINT =
  /se a hist[óo]ria envolver c[óo]digo|adapte os crit[ée]rios de aceite|^\(?(exemplo|ex\.)[:)]|preencher aqui|descreva aqui|<[^>]{3,40}>/i;
const CA_TITLE = /^(ca|crit[ée]rio|cen[áa]rio|ac)\s*[-#.]?\s*\d+/i;
const GIVEN = /^(dado|dada|given)\b/i;
const STEP = /^(quando|ent[ãa]o|e|mas|when|then|and|but)\b/i;
const THEN = /\b(ent[ãa]o|then)\b/i;

/** Limpa uma linha de wiki markup/ADF. Diz também se ela era um título (h1.–h6.). */
function cleanLine(raw: string) {
  const heading = /^\s*h[1-6]\.\s*/i.test(raw);
  const text = raw
    .replace(/^\s*h[1-6]\.\s*/i, '')
    .replace(/\{color(:[^}]*)?\}|\{noformat\}|\{code(:[^}]*)?\}|\{quote\}|\{panel(:[^}]*)?\}/gi, '')
    .replace(/\[([^|\]]+)\|[^\]]+\]/g, '$1')
    .replace(/^\s*(?:[-*#•]+|\d+[.)]|\[[ x]\])\s+/i, '')
    .replace(/^\s*-(?=\p{L})/u, '')
    .replace(/(^|\s)[*_+]+(?=\S)/g, '$1')
    .replace(/(\S)[*_+]+(?=\s|$|[,.:;!?)])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, heading };
}

/**
 * Agrupa linhas em critérios: cada "CA01 …" (ou título) com seu Dado/Quando/Então vira um critério;
 * cenários Gherkin sem título também; linhas soltas ("O sistema deve…") viram um critério cada.
 */
export function groupCriteria(lines: string[]): string[] {
  const out: string[] = [];
  let cur: { title?: string; parts: string[]; hasThen: boolean } | null = null;
  const flush = () => {
    if (cur) {
      const body = cur.parts.join(' ');
      const t = cur.title && body ? `${cur.title}: ${body}` : cur.title || body;
      if (t.length > 3) out.push(t);
    }
    cur = null;
  };
  for (const raw of lines) {
    const { text, heading } = cleanLine(raw);
    if (!text || SEPARATOR.test(text) || TEMPLATE_HINT.test(text)) continue;
    if (STOP_HEADING.test(text) && (heading || text.length < 60)) break;
    if (CA_TITLE.test(text) || (heading && text.length < 120)) {
      flush();
      cur = { title: text.replace(/\s*[-–:]\s*$/, ''), parts: [], hasThen: false };
    } else if (GIVEN.test(text)) {
      // novo cenário sem título fecha o anterior; dentro de um CA titulado, os cenários ficam juntos
      if (cur && !cur.title && cur.parts.length && cur.hasThen) flush();
      cur ??= { parts: [], hasThen: false };
      cur.parts.push(text);
      cur.hasThen ||= THEN.test(text);
    } else if (STEP.test(text) && cur) {
      cur.parts.push(text);
      cur.hasThen ||= THEN.test(text);
    } else if (cur?.title) {
      cur.parts.push(text); // continuação do CA: descrição, notas e sub-itens ("Preço vigente.", "Gap atual…")
    } else if (cur && (/:$/.test(cur.parts.at(-1) ?? '') || /;$/.test(text) || text.length < 50)) {
      cur.parts.push(text); // sub-item de um cenário sem título
    } else {
      flush();
      if (!/:\s*$/.test(text)) out.push(text); // linha de introdução ("Os critérios são:") não é critério
    }
  }
  flush();
  return out
    .filter((c) => c.length > 3)
    .map((c) => (c.length > 700 ? c.slice(0, 697) + '…' : c))
    .slice(0, 20);
}

const toLines = (value: unknown) => adfToText(value).split(/\r?\n/);

/** Critérios da seção "Critérios de aceite" da descrição; sem a seção, a partir do primeiro "Dado". */
export function criteriaFromDescription(description: unknown): string[] {
  if (!description) return [];
  const lines = toLines(description);
  const idx = lines.findIndex((l) => AC_HEADING.test(cleanLine(l).text));
  if (idx >= 0) return groupCriteria(lines.slice(idx + 1));
  const given = lines.findIndex((l) => GIVEN.test(cleanLine(l).text));
  return given >= 0 ? groupCriteria(lines.slice(given)) : [];
}

/** Tamanho do contexto da história: texto da descrição antes da seção de critérios (sem o template). */
export function contextLength(description: unknown): number {
  const lines = toLines(description);
  const idx = lines.findIndex((l) => AC_HEADING.test(cleanLine(l).text));
  return (idx >= 0 ? lines.slice(0, idx) : lines)
    .map((l) => cleanLine(l).text)
    .filter((t) => t && !TEMPLATE_HINT.test(t))
    .join(' ').length;
}

/** Critérios do campo próprio do Jira (texto, wiki markup ou ADF). */
export function criteriaFromField(value: unknown): string[] {
  if (value == null) return [];
  const lines = toLines(value);
  const first = lines.findIndex((l) => cleanLine(l).text);
  if (first >= 0 && AC_HEADING.test(cleanLine(lines[first]).text)) lines.splice(0, first + 1);
  return groupCriteria(lines);
}

/**
 * Qualidade da spec (0–100), por heurística determinística. Não usa LLM.
 * Critérios presentes e testáveis, descrição com contexto, pontos estimados e épico vinculado.
 */
export function specQualityHeuristic(s: {
  criteria: string[];
  descriptionLength: number;
  hasPoints: boolean;
  hasEpic: boolean;
}) {
  const n = s.criteria.length;
  const testable = n
    ? s.criteria.filter((c) => /\b(dado|quando|ent[ãa]o|deve|dever[áa]|given|when|then|should|must)\b/i.test(c)).length / n
    : 0;
  const score =
    35 * Math.min(n, 5) / 5 +
    20 * testable +
    (s.descriptionLength > 400 ? 20 : s.descriptionLength > 150 ? 10 : 0) +
    (s.hasPoints ? 15 : 0) +
    (s.hasEpic ? 10 : 0);
  return Math.round(Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Resposta HTTP (funciona tanto na Vercel quanto no middleware do Vite)
// ---------------------------------------------------------------------------

export type Req = IncomingMessage;
export type Res = ServerResponse;

export function query(req: Req) {
  return new URL(req.url ?? '/', 'http://localhost').searchParams;
}

export function send(res: Res, status: number, body: unknown, cacheSeconds = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    cacheSeconds > 0 && status === 200
      ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
      : 'no-store',
  );
  res.end(JSON.stringify(body));
}

export function sendError(res: Res, e: unknown) {
  const err = e instanceof JiraError ? e : new JiraError((e as Error)?.message ?? 'Erro inesperado');
  if (!(e instanceof JiraError)) console.error('[jira]', e);
  send(res, err.status, { error: err.message, status: err.status });
}
