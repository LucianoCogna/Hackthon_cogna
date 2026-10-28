import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  CalendarRange,
  ChevronsLeft,
  ChevronsRight,
  GitCompareArrows,
  GitPullRequest,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Radar,
  RotateCcw,
  Sun,
  Users,
  Fan,
  X,
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
import { DevAvatar } from '@/components/shared';
import { RadarMark } from '@/components/RadarMark';
import Login from '@/pages/Login';

/** personas: quem pode abrir a aba (o Dev vê só a própria visão nas abas que acessa) */
type NavItem = { to: string; label: string; icon: React.ElementType; personas: Persona[]; tag?: string };
export const NAV: NavItem[] = [
  { to: '/', label: 'Visão Executiva', icon: LayoutDashboard, personas: ['vp', 'tl', 'dev'] },
  { to: '/github', label: 'GitHub por Dev', icon: GitPullRequest, personas: ['vp', 'tl'] },
  { to: '/aderencia', label: 'GitHub × Jira', icon: GitCompareArrows, personas: ['vp', 'tl'] },
  { to: '/ia', label: 'Uso de IA', icon: Bot, personas: ['vp', 'tl', 'dev'] },
  { to: '/radar', label: 'Radar de PRs', icon: Radar, personas: ['vp', 'tl'] },
  { to: '/crew', label: 'KiroCópter', icon: Fan, personas: ['vp', 'tl', 'dev'] },
];

/** Rotas fora do menu (ex.: /guardrails) ficam livres. */
export function canAccess(persona: Persona, pathname: string) {
  const item = NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname === n.to || pathname.startsWith(n.to + '/')));
  return !item || item.personas.includes(persona);
}

function readCollapsed() {
  try {
    return localStorage.getItem('radar.sidebar') === '1';
  } catch {
    return false;
  }
}

function Logo({ compact, onBrand = true }: { compact?: boolean; onBrand?: boolean }) {
  // onBrand: dentro da sidebar (textos com as cores da sidebar); fora dela, cores do conteúdo
  const c = 'var(--accent)';
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn('relative h-8 w-8 shrink-0 rounded-lg border', 'border-accent/30 bg-accent-soft')}
      >
        <RadarMark color={c} className="absolute inset-0" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className={cn('text-sm font-bold tracking-[0.18em]', onBrand ? 'text-side-text' : 'text-text')}>RADAR</div>
          <div className={cn('flex items-center gap-1.5 text-[10px]', onBrand ? 'text-side-muted' : 'text-muted')}>
            Engenharia ·<CognaLogo height={12} className="text-accent" />
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
      {NAV.filter((item) => item.personas.includes(persona)).map((item) => {
        const Icon = item.icon;
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
                  ? 'bg-side-active font-semibold text-side-active-text'
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
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-side-active-text"
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
                  <span className="num rounded-full bg-risk px-1.5 py-0.5 text-[10px] font-semibold text-white">{criticalCount}</span>
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

/** Usuário logado, no rodapé da sidebar (roxa). Recolhida, mostra só o avatar e o botão de sair. */
function UserMenu({ collapsed }: { collapsed?: boolean }) {
  const { session, logout } = useApp();
  const navigate = useNavigate();
  if (!session) return null;
  const squad = session.squadId && squads.find((s) => s.id === session.squadId)?.name;
  const exit = () => {
    logout();
    navigate('/', { replace: true });
  };
  const logoutBtn = (
    <Tooltip side={collapsed ? 'right' : 'top'} content="Sair">
      <button onClick={exit} aria-label="Sair"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-side-muted hover:bg-side-hover hover:text-side-text">
        <LogOut className="h-4 w-4" />
      </button>
    </Tooltip>
  );
  if (collapsed)
    return (
      <div className="mb-2 flex flex-col items-center gap-1">
        <Tooltip side="right" content={<><b>{session.name}</b><br />{PERSONAS[session.persona].short}{squad && ` · ${squad}`}</>}>
          <span><DevAvatar name={session.name} size={32} /></span>
        </Tooltip>
        {logoutBtn}
      </div>
    );
  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-side-border bg-side-surface p-2.5">
      <DevAvatar name={session.name} size={32} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-xs font-semibold text-side-text">{session.name}</div>
        <div className="truncate text-[10px] text-side-muted">
          {PERSONAS[session.persona].short}
          {squad && <> · {squad}</>}
        </div>
      </div>
      {logoutBtn}
    </div>
  );
}

function FilterBar() {
  const { filters, setFilters, resetFilters, session } = useApp();
  const locked = session?.squadId;
  const dirty = filters.squadId !== (locked ?? 'all') || filters.sprintId !== 'all' || filters.period !== 4;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        icon={<Users className="h-3.5 w-3.5" />}
        label="Squad"
        value={filters.squadId}
        onChange={(v) => setFilters({ squadId: v })}
        options={
          locked
            ? squads.filter((s) => s.id === locked).map((s) => ({ value: s.id, label: s.name }))
            : [{ value: 'all', label: 'Todos os squads' }, ...squads.map((s) => ({ value: s.id, label: s.name }))]
        }
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
  const { theme, toggleTheme, persona, session } = useApp();
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

  if (!session) return <Login />;
  if (!canAccess(persona, location.pathname)) return <Navigate to={PERSONAS[persona].home} replace />;

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-side-border bg-[var(--side-bg)] lg:flex',
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
            <div className="mb-3 rounded-lg border border-side-border bg-side-surface p-3 text-[11px] leading-relaxed text-side-muted">
              <span className="font-semibold text-side-text">Protótipo.</span> Jira (Pricing) conectado em GitHub × Jira. GitHub e Kiro/AWS ainda simulados.
            </div>
          )}
          <UserMenu collapsed={collapsed} />
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
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-side-border bg-[var(--side-bg)] lg:hidden"
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
              <div className="flex-1 overflow-y-auto p-3">
                <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} criticalCount={criticalCount} />
              </div>
              <div className="border-t border-side-border p-3">
                <UserMenu />
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
