import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { KiroUsage, PullRequest, Sprint, Story } from '@/mocks/types';
import { sprints, sprintById } from '@/mocks/sprints';
import { pullRequests } from '@/mocks/prs';
import { stories, incomingDemand, initialBacklog } from '@/mocks/stories';
import { kiroUsage } from '@/mocks/kiro';
import { devs, devById } from '@/mocks/devs';
import { squads } from '@/mocks/squads';
import { sprintSeries, type SprintPoint } from '@/lib/metrics';

export type Persona = 'vp' | 'tl' | 'dev';
export type Theme = 'dark' | 'light';
export type Filters = { squadId: string; sprintId: string; period: number };

export const PERSONAS: Record<Persona, { label: string; short: string; home: string; description: string }> = {
  vp: { label: 'VP / Head de Engenharia', short: 'VP', home: '/', description: 'Todos os squads e todas as abas' },
  tl: { label: 'Tech Manager / Tech Lead', short: 'Tech Lead', home: '/radar', description: 'Todas as abas, com os dados do seu squad' },
  dev: { label: 'Dev', short: 'Dev', home: '/', description: 'Suas métricas individuais e o KiroCópter' },
};

// ---------------------------------------------------------------------------
// Login de teste (protótipo): define a persona e o recorte de dados de quem entra.
// Não é autenticação de verdade; os dados reais do Jira seguem protegidos pelo código de acesso da API.
// ---------------------------------------------------------------------------
export type Session = {
  email: string;
  name: string;
  persona: Persona;
  /** squad fixo nos filtros (Tech Lead e Dev) */
  squadId?: string;
  /** dados restritos a este dev (Dev) */
  devId?: string;
};

export const TEST_PASSWORD = 'radar123';
export const TEST_USERS: Session[] = [
  { email: 'vp@radar.teste', name: 'VP de Engenharia', persona: 'vp' },
  { email: 'techlead@radar.teste', name: 'Helena Duarte', persona: 'tl', squadId: 'pricing' },
  { email: 'dev@radar.teste', name: 'Dev de teste', persona: 'dev', squadId: devById.me.squadId, devId: devById.me.id },
];

export const PERIODS = [
  { value: 1, label: 'Última sprint' },
  { value: 4, label: 'Últimas 4 sprints' },
  { value: 8, label: 'Últimas 8 sprints' },
  { value: 14, label: 'Tudo (14 sprints)' },
];

type Ctx = {
  theme: Theme;
  toggleTheme: () => void;
  session: Session | null;
  /** persona da sessão (VP quando não há sessão) */
  persona: Persona;
  login: (email: string, password: string) => Session | null;
  logout: () => void;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
};

const AppCtx = createContext<Ctx | null>(null);
const DEFAULT_FILTERS: Filters = { squadId: 'all', sprintId: 'all', period: 4 };

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readLS('radar.theme', 'light'));
  const [session, setSession] = useState<Session | null>(() => {
    const email = readLS<string | null>('radar.session', null);
    return TEST_USERS.find((u) => u.email === email) ?? null;
  });
  const defaults = (s: Session | null): Filters => ({ ...DEFAULT_FILTERS, squadId: s?.squadId ?? 'all' });
  const [filters, setFiltersState] = useState<Filters>(() => defaults(session));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeLS('radar.theme', theme);
  }, [theme]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      session,
      persona: session?.persona ?? 'vp',
      login: (email, password) => {
        const user = TEST_USERS.find((u) => u.email === email.trim().toLowerCase());
        if (!user || password !== TEST_PASSWORD) return null;
        setSession(user);
        writeLS('radar.session', user.email);
        setFiltersState(defaults(user));
        return user;
      },
      logout: () => {
        setSession(null);
        writeLS('radar.session', null);
        setFiltersState(DEFAULT_FILTERS);
      },
      filters,
      // Tech Lead e Dev ficam presos ao próprio squad
      setFilters: (f) => setFiltersState((cur) => ({ ...cur, ...f, squadId: session?.squadId ?? f.squadId ?? cur.squadId })),
      resetFilters: () => setFiltersState(defaults(session)),
    }),
    [theme, session, filters],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}

// ---------------------------------------------------------------------------
// Escopo: aplica os filtros globais aos dados (usado por todas as abas)
// ---------------------------------------------------------------------------
export const devSquad: Record<string, string> = Object.fromEntries(devs.map((d) => [d.id, d.squadId]));

export type Scope = {
  filters: Filters;
  /** sprints usadas em KPIs e tabelas */
  scopeSprints: Sprint[];
  /** janela anterior de mesmo tamanho (para deltas); pode ser vazia */
  prevSprints: Sprint[];
  scopeLabel: string;
  inSquad: (squadId: string) => boolean;
  prs: PullRequest[];
  prevPrs: PullRequest[];
  /** todos os PRs do squad filtrado (todas as sprints) — para séries temporais */
  allPrs: PullRequest[];
  stories: Story[];
  prevStories: Story[];
  allStories: Story[];
  usage: KiroUsage[];
  prevUsage: KiroUsage[];
  allUsage: KiroUsage[];
  devCount: number;
  series: SprintPoint[];
  squadCount: number;
};

export function useScope(): Scope {
  const { filters, session } = useApp();
  const devId = session?.devId;
  return useMemo(() => {
    const scopeSprints =
      filters.sprintId !== 'all' ? [sprintById[filters.sprintId]] : sprints.slice(-filters.period);
    const first = scopeSprints[0].index;
    const len = scopeSprints.length;
    const prevSprints = sprints.slice(Math.max(0, first - len), first);
    const ids = new Set(scopeSprints.map((s) => s.id));
    const prevIds = new Set(prevSprints.map((s) => s.id));
    const inSquad = (sq: string) => filters.squadId === 'all' || sq === filters.squadId;

    // Dev: só os próprios PRs e o próprio uso do Kiro (histórias não têm responsável no mock e ficam no nível do squad)
    const allPrs = pullRequests.filter((p) => inSquad(p.squadId) && (!devId || p.authorId === devId));
    const allStories = stories.filter((s) => inSquad(s.squadId));
    const allUsage = kiroUsage.filter((u) => inSquad(devSquad[u.devId]) && (!devId || u.devId === devId));
    const devCount = devId ? 1 : devs.filter((d) => inSquad(d.squadId)).length;
    // só squads com pessoas contam (um squad recém-cadastrado ainda não tem dados)
    const withData = squads.filter((sq) => devs.some((d) => d.squadId === sq.id)).length;
    const squadCount = filters.squadId === 'all' ? withData : 1;
    const scale = squadCount / withData;

    const scopeLabel =
      filters.sprintId !== 'all'
        ? sprintById[filters.sprintId].name
        : len === 1
          ? scopeSprints[0].name
          : `S${first + 1}–S${first + len}`;

    return {
      filters,
      scopeSprints,
      prevSprints,
      scopeLabel,
      inSquad,
      prs: allPrs.filter((p) => ids.has(p.sprintId)),
      prevPrs: allPrs.filter((p) => prevIds.has(p.sprintId)),
      allPrs,
      stories: allStories.filter((s) => ids.has(s.sprintId)),
      prevStories: allStories.filter((s) => prevIds.has(s.sprintId)),
      allStories,
      usage: allUsage.filter((u) => ids.has(u.sprintId)),
      prevUsage: allUsage.filter((u) => prevIds.has(u.sprintId)),
      allUsage,
      devCount,
      squadCount,
      series: sprintSeries(sprints, allPrs, allStories, allUsage, devCount, {
        incoming: incomingDemand,
        initial: initialBacklog,
        scale,
      }),
    };
  }, [filters, devId]);
}
