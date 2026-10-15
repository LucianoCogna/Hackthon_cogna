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
  vp: { label: 'VP / Head de Engenharia', short: 'VP', home: '/', description: 'Impacto da IA, custo e antes × depois' },
  tl: { label: 'Tech Manager / Tech Lead', short: 'Tech Lead', home: '/radar', description: 'Alertas de PR e qualidade por squad' },
  dev: { label: 'Dev', short: 'Dev', home: '/github', description: 'Suas métricas vs. a média do time' },
};

export const PERIODS = [
  { value: 1, label: 'Última sprint' },
  { value: 4, label: 'Últimas 4 sprints' },
  { value: 8, label: 'Últimas 8 sprints' },
  { value: 14, label: 'Tudo (14 sprints)' },
];

type Ctx = {
  theme: Theme;
  toggleTheme: () => void;
  persona: Persona;
  setPersona: (p: Persona) => void;
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
  const [theme, setTheme] = useState<Theme>(() => readLS('radar.theme', 'dark'));
  const [persona, setPersonaState] = useState<Persona>(() => readLS('radar.persona', 'vp'));
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeLS('radar.theme', theme);
  }, [theme]);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      persona,
      setPersona: (p) => {
        setPersonaState(p);
        writeLS('radar.persona', p);
        setFiltersState(p === 'dev' ? { ...DEFAULT_FILTERS, squadId: devById.me.squadId } : DEFAULT_FILTERS);
      },
      filters,
      setFilters: (f) => setFiltersState((cur) => ({ ...cur, ...f })),
      resetFilters: () => setFiltersState(DEFAULT_FILTERS),
    }),
    [theme, persona, filters],
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
  const { filters } = useApp();
  return useMemo(() => {
    const scopeSprints =
      filters.sprintId !== 'all' ? [sprintById[filters.sprintId]] : sprints.slice(-filters.period);
    const first = scopeSprints[0].index;
    const len = scopeSprints.length;
    const prevSprints = sprints.slice(Math.max(0, first - len), first);
    const ids = new Set(scopeSprints.map((s) => s.id));
    const prevIds = new Set(prevSprints.map((s) => s.id));
    const inSquad = (sq: string) => filters.squadId === 'all' || sq === filters.squadId;

    const allPrs = pullRequests.filter((p) => inSquad(p.squadId));
    const allStories = stories.filter((s) => inSquad(s.squadId));
    const allUsage = kiroUsage.filter((u) => inSquad(devSquad[u.devId]));
    const devCount = devs.filter((d) => inSquad(d.squadId)).length;
    const squadCount = filters.squadId === 'all' ? squads.length : 1;
    const scale = squadCount / squads.length;

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
  }, [filters]);
}
