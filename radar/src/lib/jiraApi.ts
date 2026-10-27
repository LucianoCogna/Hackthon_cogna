import { useCallback, useEffect, useState } from 'react';
import type { JiraBoardResponse } from '../../api/_lib/types';

export type { JiraBoardResponse, JiraSprint, JiraStory } from '../../api/_lib/types';

type State =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'ok'; data: JiraBoardResponse; error?: undefined }
  | { status: 'error'; data?: undefined; error: { message: string; code: number } };

// cache simples no navegador para não refazer a busca a cada troca de aba
const memo = new Map<string, { at: number; data: JiraBoardResponse }>();
const TTL = 5 * 60_000;

export function useJiraBoard(squadId: string, sprints = 6) {
  const key = `${squadId}:${sprints}`;
  const [state, setState] = useState<State>(() => {
    const hit = memo.get(key);
    return hit && Date.now() - hit.at < TTL ? { status: 'ok', data: hit.data } : { status: 'loading' };
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const hit = memo.get(key);
    if (nonce === 0 && hit && Date.now() - hit.at < TTL) {
      setState({ status: 'ok', data: hit.data });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetch(`/api/jira/board?squad=${encodeURIComponent(squadId)}&sprints=${sprints}${nonce ? `&t=${nonce}` : ''}`, {
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw { message: body.error ?? `Erro ${r.status} ao consultar o Jira`, code: r.status };
        memo.set(key, { at: Date.now(), data: body });
        setState({ status: 'ok', data: body });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setState({
          status: 'error',
          error: { message: e?.message ?? 'Não foi possível conectar à API', code: e?.code ?? 0 },
        });
      });
    return () => ctrl.abort();
  }, [key, nonce, squadId, sprints]);

  const reload = useCallback(() => {
    memo.delete(key);
    setNonce((n) => n + 1);
  }, [key]);

  return { ...state, reload };
}
