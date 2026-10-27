import { useCallback, useEffect, useState } from 'react';
import type { GithubPrsResponse, JiraBoardResponse } from '../../api/_lib/types';

export type {
  GithubDev,
  GithubPr,
  GithubPrsResponse,
  JiraBoardResponse,
  JiraSprint,
  JiraStory,
} from '../../api/_lib/types';

export type ApiState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'ok'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: { message: string; code: number } };

// cache simples no navegador para não refazer a busca a cada troca de aba
const memo = new Map<string, { at: number; data: unknown }>();
const TTL = 5 * 60_000;

/** GET em /api/... com cache de 5 min, cancelamento e recarga manual. */
export function useApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T>>(() => {
    const hit = memo.get(url);
    return hit && Date.now() - hit.at < TTL ? { status: 'ok', data: hit.data as T } : { status: 'loading' };
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const hit = memo.get(url);
    if (nonce === 0 && hit && Date.now() - hit.at < TTL) {
      setState({ status: 'ok', data: hit.data as T });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetch(nonce ? `${url}${url.includes('?') ? '&' : '?'}t=${nonce}` : url, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw { message: body.error ?? `Erro ${r.status} ao consultar a API`, code: r.status };
        memo.set(url, { at: Date.now(), data: body });
        setState({ status: 'ok', data: body as T });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', error: { message: e?.message ?? 'Não foi possível conectar à API', code: e?.code ?? 0 } });
      });
    return () => ctrl.abort();
  }, [url, nonce]);

  const reload = useCallback(() => {
    memo.delete(url);
    setNonce((n) => n + 1);
  }, [url]);

  return { ...state, reload };
}

export const useJiraBoard = (squadId: string, sprints = 6) =>
  useApi<JiraBoardResponse>(`/api/jira/board?squad=${encodeURIComponent(squadId)}&sprints=${sprints}`);

/** PRs do squad (hoje simulados a partir do Jira; depois, GitHub real com o mesmo formato). */
export const useGithubPrs = (squadId: string, sprints = 6) =>
  useApi<GithubPrsResponse>(`/api/github/prs?squad=${encodeURIComponent(squadId)}&sprints=${sprints}`);
