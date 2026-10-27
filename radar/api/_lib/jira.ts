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

/** Itens de lista de um documento ADF (ou linhas, se não houver lista). */
function adfItems(node: unknown): string[] {
  if (typeof node === 'string') return splitLines(node);
  const items: string[] = [];
  const walk = (n: Adf) => {
    if (n.type === 'listItem' || n.type === 'taskItem') {
      const t = adfToText(n).replace(/\s+/g, ' ').trim();
      if (t) items.push(t);
      return;
    }
    (n.content ?? []).forEach(walk);
  };
  walk(node as Adf);
  return items.length ? items : splitLines(adfToText(node));
}

const splitLines = (text: string) =>
  text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*([-*•]|\d+[.)]|\[[ x]\])\s*/i, '').trim())
    .filter((l) => l.length > 3);

const AC_HEADING = /crit[ée]rios? de aceit|acceptance criteria|^aceite/i;

/** Extrai os critérios da seção "Critérios de aceite" da descrição (fallback quando não há campo próprio). */
export function criteriaFromDescription(description: unknown): string[] {
  if (!description) return [];
  if (typeof description === 'string') {
    const idx = description.search(AC_HEADING);
    return idx < 0 ? [] : splitLines(description.slice(idx).split(/\n/).slice(1).join('\n')).slice(0, 15);
  }
  const blocks = (description as Adf).content ?? [];
  const start = blocks.findIndex((b) => AC_HEADING.test(adfToText(b)));
  if (start < 0) return [];
  const out: string[] = [];
  for (const b of blocks.slice(start + 1)) {
    if (b.type === 'heading') break;
    out.push(...adfItems(b));
  }
  return out.slice(0, 15);
}

export function criteriaFromField(value: unknown): string[] {
  if (value == null) return [];
  return adfItems(value).slice(0, 15);
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
