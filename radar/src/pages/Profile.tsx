import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Mail, Moon, ShieldCheck, Sun, Users } from 'lucide-react';
import { PERSONAS, useApp } from '@/app/store';
import { NAV } from '@/app/Layout';
import { useSquads } from '@/app/squadRegistry';
import { DevAvatar, FadeIn, PageHeader } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SquadsSection } from './SquadsSection';

export default function Profile() {
  const { session, persona, logout, theme, toggleTheme } = useApp();
  const squads = useSquads();
  const navigate = useNavigate();
  if (!session) return null;
  const squad = session.squadId ? squads.find((s) => s.id === session.squadId) : null;
  const tabs = NAV.filter((n) => n.personas.includes(persona));

  return (
    <div>
      <PageHeader eyebrow="Meu perfil" title={session.name} subtitle={PERSONAS[persona].label} />

      <FadeIn>
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-5">
            <DevAvatar name={session.name} size={56} />
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-3">
              <Info label="E-mail" icon={<Mail className="h-3.5 w-3.5" />}>
                <span className="num">{session.email}</span>
              </Info>
              <Info label="Perfil" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                {PERSONAS[persona].short}
                <div className="text-xs text-muted">{PERSONAS[persona].description}</div>
              </Info>
              <Info label="Squad" icon={<Users className="h-3.5 w-3.5" />}>
                {squad ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: squad.color }} />
                    {squad.name}
                  </span>
                ) : (
                  'Todos os squads da VP'
                )}
              </Info>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  navigate('/', { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 text-xs font-medium text-muted">Abas que você acessa</div>
            <div className="flex flex-wrap gap-1.5">
              {tabs.map((t) => (
                <NavLink key={t.to} to={t.to}>
                  <Badge tone="neutral" className="cursor-pointer hover:border-accent/50 hover:text-text">
                    <t.icon className="h-3 w-3" /> {t.label}
                  </Badge>
                </NavLink>
              ))}
            </div>
          </div>
        </Card>
      </FadeIn>

      {persona !== 'dev' && (
        <FadeIn delay={0.1} className="mt-8">
          <SquadsSection />
        </FadeIn>
      )}
    </div>
  );
}

function Info({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon} {label}
      </div>
      <div className="truncate text-sm font-medium text-text">{children}</div>
    </div>
  );
}
