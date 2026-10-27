import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  CalendarRange,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  GitCompareArrows,
  GitPullRequest,
  LayoutDashboard,
  Menu,
  Moon,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  Fan,
  X,
  UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PERIODS, PERSONAS, useApp, useScope, type Persona } from './store';
import { Select } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/overlay';
import { squads } from '@/mocks/squads';
import { sprints } from '@/mocks/sprints';
import { prRisk } from '@/lib/metrics';
import { CognaLogo } from '@/components/CognaLogo';

type NavItem = { to: string; label: string; icon: React.ElementType; personas: Persona[]; tag?: string };
export const NAV: NavItem[] = [
  { to: '/', label: 'Visão Executiva', icon: LayoutDashboard, personas: ['vp'] },
  { to: '/github', label: 'GitHub por Dev', icon: GitPullRequest, personas: ['tl', 'dev'] },
  { to: '/aderencia', label: 'GitHub × Jira', icon: GitCompareArrows, personas: ['tl'] },
  { to: '/ia', label: 'Uso de IA', icon: Bot, personas: ['vp', 'tl', 'dev'] },
  { to: '/custo', label: 'Custo & Governança', icon: Wallet, personas: ['vp'] },
  { to: '/radar', label: 'Radar de PRs', icon: Radar, personas: ['tl'] },
  { to: '/projetos', label: 'Status de Projetos', icon: FolderKanban, personas: ['vp', 'tl'] },
  { to: '/guardrails', label: 'Guardrails & Skills', icon: ShieldCheck, personas: ['dev', 'tl'] },
  { to: '/crew', label: 'KiroCópter', icon: Fan, personas: ['vp', 'tl', 'dev'] },
];

function readCollapsed() {
  try {
    return localStorage.getItem('radar.sidebar') === '1';
  } catch {
    return false;
  }
}

function Logo({ compact, onBrand = true }: { compact?: boolean; onBrand?: boolean }) {
  // onBrand: sobre a sidebar roxa (branco + amarelo Cogna); fora dela, usa a cor primária
  const c = onBrand ? 'var(--brand-yellow)' : 'var(--accent)';
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn('relative h-8 w-8 shrink-0 rounded-lg border', onBrand ? 'border-white/20 bg-white/10' : 'border-accent/30 bg-accent-soft')}
      >
        <svg viewBox="0 0 32 32" className="absolute inset-0">
          <circle cx="16" cy="16" r="10" fill="none" stroke={c} strokeWidth="1.5" opacity=".45" />
          <circle cx="16" cy="16" r="5" fill="none" stroke={c} strokeWidth="1.5" opacity=".7" />
          <g className="radar-sweep">
            <path d="M16 16 L16 5 A11 11 0 0 1 25 10 Z" fill={c} opacity=".28" />
            <path d="M16 16 L25 10" stroke={c} strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle cx="16" cy="16" r="1.8" fill={c} />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className={cn('text-sm font-bold tracking-[0.18em]', onBrand ? 'text-side-text' : 'text-text')}>RADAR</div>
          <div className={cn('flex items-center gap-1.5 text-[10px]', onBrand ? 'text-side-muted' : 'text-muted')}>
            Engenharia ·<CognaLogo height={12} className={onBrand ? 'text-side-text' : 'text-accent'} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate, criticalCount }: { collapsed: boolean; onNavigate?: () => void; criticalCount: number }) {
  const { persona } = useApp();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const recommended = item.personas.includes(persona);
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                isActive
                  ? 'bg-side-active font-semibold text-side-text'
                  : 'text-side-muted hover:bg-side-hover hover:text-side-text',
                collapsed && 'justify-center px-0',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-yellow shadow-[0_0_12px_var(--brand-yellow)]"
                  />
                )}
                <span className="relative">
                  <Icon className="h-[18px] w-[18px]" />
                  {item.to === '/radar' && criticalCount > 0 && collapsed && (
                    <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-risk ring-2 ring-[var(--side-bg)]" />
                  )}
                </span>
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.to === '/radar' && criticalCount > 0 && (
                  <span className="num rounded-full bg-[#ff5c5c] px-1.5 py-0.5 text-[10px] font-bold text-white">{criticalCount}</span>
                )}
                {!collapsed && recommended && item.to !== '/radar' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow/80" title={`Recomendado para ${PERSONAS[persona].short}`} />
                )}
              </>
            )}
          </NavLink>
        );
        return collapsed ? (
          <Tooltip key={item.to} side="right" content={item.label}>
            {link}
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}

function PersonaSwitch() {
  const { persona, setPersona } = useApp();
  const navigate = useNavigate();
  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label="Visão">
      {(Object.keys(PERSONAS) as Persona[]).map((p) => (
        <Tooltip key={p} side="bottom" content={<><b>{PERSONAS[p].label}</b><br />{PERSONAS[p].description}</>}>
          <button
            role="radio"
            aria-checked={persona === p}
            onClick={() => {
              setPersona(p);
              navigate(PERSONAS[p].home);
            }}
            className={cn(
              'cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
              persona === p ? 'bg-accent text-on-accent shadow-[0_0_14px_-4px_var(--accent)]' : 'text-muted hover:text-text',
            )}
          >
            {PERSONAS[p].short}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

function FilterBar() {
  const { filters, setFilters, resetFilters } = useApp();
  const dirty = filters.squadId !== 'all' || filters.sprintId !== 'all' || filters.period !== 4;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        icon={<Users className="h-3.5 w-3.5" />}
        label="Squad"
        value={filters.squadId}
        onChange={(v) => setFilters({ squadId: v })}
        options={[{ value: 'all', label: 'Todos os squads' }, ...squads.map((s) => ({ value: s.id, label: s.name }))]}
        className="w-[188px]"
      />
      <Select
        icon={<CalendarRange className="h-3.5 w-3.5" />}
        label="Período"
        value={String(filters.period)}
        onChange={(v) => setFilters({ period: Number(v), sprintId: 'all' })}
        options={PERIODS.map((p) => ({ value: String(p.value), label: p.label }))}
        className={cn('w-[190px]', filters.sprintId !== 'all' && 'opacity-50')}
      />
      <Select
        label="Sprint"
        value={filters.sprintId}
        onChange={(v) => setFilters({ sprintId: v })}
        options={[
          { value: 'all', label: 'Todas as sprints' },
          ...[...sprints].reverse().map((s) => ({ value: s.id, label: `${s.name} · ${s.start.slice(8, 10)}/${s.start.slice(5, 7)}` })),
        ]}
        className="w-[172px]"
      />
      {dirty && (
        <Tooltip content="Limpar filtros">
          <Button variant="ghost" size="icon" onClick={resetFilters} aria-label="Limpar filtros">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

export function Layout() {
  const { theme, toggleTheme, persona } = useApp();
  const scope = useScope();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem('radar.sidebar', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const criticalCount = useMemo(() => scope.prs.filter((p) => prRisk(p) >= 70).length, [scope.prs]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col bg-[linear-gradient(180deg,var(--side-bg),var(--side-bg-2))] lg:flex',
          collapsed ? 'w-[68px]' : 'w-[252px]',
        )}
        style={{ transition: 'width .25s ease' }}
      >
        <div className={cn('flex h-16 items-center border-b border-side-border px-4', collapsed && 'justify-center px-0')}>
          <Logo compact={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav collapsed={collapsed} criticalCount={criticalCount} />
        </div>
        <div className="border-t border-side-border p-3">
          {!collapsed && (
            <div className="mb-3 rounded-lg border border-side-border bg-white/5 p-3 text-[11px] leading-relaxed text-side-muted">
              <span className="font-semibold text-side-text">Protótipo.</span> Jira (Pricing) conectado em GitHub × Jira. GitHub e Kiro/AWS ainda simulados.
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg text-xs text-side-muted hover:bg-side-hover hover:text-side-text"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Recolher</>}
          </button>
        </div>
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[linear-gradient(180deg,var(--side-bg),var(--side-bg-2))] lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="flex h-16 items-center justify-between border-b border-side-border px-4">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 text-side-muted hover:text-side-text" aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-3">
                <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} criticalCount={criticalCount} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
          <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Logo compact onBrand={false} />
            </div>
            <div className="flex items-center gap-2">
              <UserCircle2 className="hidden h-4 w-4 text-muted sm:block" />
              <span className="hidden text-xs text-muted sm:inline">Visão</span>
              <PersonaSwitch />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <FilterBar />
              <Tooltip content={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
                <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </Tooltip>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 lg:px-8" key={persona}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
