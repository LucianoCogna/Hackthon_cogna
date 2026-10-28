import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, Crown, KeyRound, Mail, Moon, Sun, Users } from 'lucide-react';
import { PERSONAS, TEST_PASSWORD, TEST_USERS, useApp, type Persona, type Session } from '@/app/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/misc';
import { CognaLogo } from '@/components/CognaLogo';
import { RadarMark } from '@/components/RadarMark';
import { squadById } from '@/mocks/squads';

const ICON: Record<Persona, React.ElementType> = { vp: Crown, tl: Users, dev: Code2 };

const scopeOf = (u: Session) =>
  u.persona === 'vp' ? 'Toda a VP' : u.persona === 'tl' ? `Squad ${squadById[u.squadId!].name}` : 'Só os seus dados';

const PILLARS = [
  'Pontos do Jira × PRs do GitHub, por squad e por pessoa',
  'Aderência do código aos critérios de aceite',
  'Riscos do código gerado por IA com revisão curta',
];

export default function Login() {
  const { login, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const enter = (e: string, p: string) => {
    const user = login(e, p);
    if (!user) return setError(true);
    navigate(PERSONAS[user.persona].home, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Painel da marca: primary do DS Cogna (fixo nos dois temas) */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,var(--brand),var(--brand-dark))] p-10 lg:flex">
        <RadarMark color="var(--brand-yellow)" className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] opacity-25" />
        <div className="relative flex items-center gap-2 text-white">
          <CognaLogo height={22} className="text-white" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 rounded-2xl border border-white/20 bg-white/10">
              <RadarMark color="var(--brand-yellow)" className="absolute inset-0" />
            </div>
            <div>
              <div className="text-4xl font-bold tracking-[0.2em] text-white">RADAR</div>
              <div className="text-sm text-white/75">Inteligência de Engenharia</div>
            </div>
          </div>
          <p className="mt-8 max-w-md text-2xl font-semibold leading-snug text-white">
            A IA está fazendo a engenharia entregar <span className="text-brand-yellow">melhor</span>, ou só entregar mais?
          </p>
          <ul className="mt-6 space-y-3">
            {PILLARS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-white/75">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-yellow shadow-[0_0_10px_var(--brand-yellow)]" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/75">Hackathon Cogna · protótipo</div>
      </aside>

      {/* Formulário */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Alternar tema" className="absolute right-4 top-4">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="w-full max-w-[420px]">
          {/* marca compacta no celular */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="relative h-10 w-10 rounded-lg border border-accent/30 bg-accent-soft">
              <RadarMark color="var(--accent)" className="absolute inset-0" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-[0.18em]">RADAR</div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                Engenharia · <CognaLogo height={12} className="text-accent" />
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Bem-vindo</div>
          <h1 className="mt-1 text-2xl font-semibold">Entre no RADAR</h1>
          <p className="mt-1 text-sm text-muted">Use um dos usuários de teste abaixo.</p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              enter(email, password);
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">E-mail</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                <Input type="email" autoComplete="username" placeholder="voce@radar.teste" value={email} className="h-10 pl-9"
                  onChange={(e) => { setEmail(e.target.value); setError(false); }} />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Senha</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
                <Input type="password" autoComplete="current-password" placeholder="••••••••" value={password} className="h-10 pl-9"
                  onChange={(e) => { setPassword(e.target.value); setError(false); }} />
              </div>
            </label>
            {error && <p className="text-xs font-medium text-risk">E-mail ou senha inválidos.</p>}
            <Button type="submit" variant="primary" className="h-10 w-full">
              Entrar <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-border" /> ou entre direto como <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            {TEST_USERS.map((u) => {
              const Icon = ICON[u.persona];
              return (
                <button key={u.email} onClick={() => enter(u.email, TEST_PASSWORD)}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-yellow">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {PERSONAS[u.persona].short} <span className="font-normal text-muted">· {scopeOf(u)}</span>
                    </div>
                    <div className="num truncate text-xs text-muted">{u.email}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            Senha de todos: <span className="num rounded bg-surface-2 px-1.5 py-0.5 text-text">{TEST_PASSWORD}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
