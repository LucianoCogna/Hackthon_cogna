import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, CircleDashed, GitBranch, KanbanSquare, Loader2, Pencil, Plug, Plus, Trash2, Bot, Users, XCircle } from 'lucide-react';
import { useApp } from '@/app/store';
import { isBaseSquad, removeSquad, saveSquad, slugify, useSquads } from '@/app/squadRegistry';
import { FadeIn, KpiCard } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Table, Td, Th } from '@/components/ui/misc';
import { Dialog, DialogContent } from '@/components/ui/overlay';
import { devs } from '@/mocks/devs';
import { pullRequests } from '@/mocks/prs';
import { stories } from '@/mocks/stories';
import { kiroUsage } from '@/mocks/kiro';
import type { Squad } from '@/mocks/types';
import { fmtInt } from '@/lib/format';
import { cn } from '@/lib/cn';

/** paleta de gráficos do DS Cogna (chart-1…14) */
const COLORS = ['#4700C2', '#008564', '#4CA0CB', '#FFA500', '#DD392D', '#0791A6', '#61A711', '#D25D04', '#0C81C0', '#A97E19', '#CC148F', '#1A934D', '#BF3F18', '#2C5896'];

const JIRA_KEY = /^[A-Z][A-Z0-9]{1,9}$/;
const REPO = /^[\w.-]+(\/[\w.-]+)?$/;

type Status = { tone: Tone; label: string };
type Usage = { devs: number; stories: number; prs: number; kiroDevs: number };

function useUsage() {
  return useMemo(() => {
    const m: Record<string, Usage> = {};
    const get = (id: string) => (m[id] ??= { devs: 0, stories: 0, prs: 0, kiroDevs: 0 });
    for (const d of devs) get(d.squadId).devs++;
    for (const s of stories) get(s.squadId).stories++;
    for (const p of pullRequests) get(p.squadId).prs++;
    const kiro = new Map<string, Set<string>>();
    const squadOf = Object.fromEntries(devs.map((d) => [d.id, d.squadId]));
    for (const u of kiroUsage) {
      const sq = squadOf[u.devId];
      if (!kiro.has(sq)) kiro.set(sq, new Set());
      kiro.get(sq)!.add(u.devId);
    }
    for (const [sq, set] of kiro) get(sq).kiroDevs = set.size;
    return m;
  }, []);
}

/** Status de cada integração. Squads do mock já sincronizam; os cadastrados aguardam a primeira leitura. */
function statuses(s: Squad, u: Usage | undefined) {
  const synced = !!u && (u.stories > 0 || u.prs > 0);
  const pending: Status = s.checkedAt ? { tone: 'accent', label: 'Validado · aguardando 1ª sincronização' } : { tone: 'warn', label: 'Configurado · não testado' };
  return {
    jira: !s.jiraProject || !s.jiraBoardId ? { tone: 'neutral', label: 'Não configurado' } : synced ? { tone: 'ok', label: `${fmtInt(u!.stories)} histórias` } : pending,
    github: !s.repos?.length ? { tone: 'neutral', label: 'Não configurado' } : synced ? { tone: 'ok', label: `${fmtInt(u!.prs)} PRs` } : pending,
    kiro: !s.kiro ? { tone: 'neutral', label: 'Desligado' } : synced ? { tone: 'ok', label: `${u!.kiroDevs} devs com uso` } : pending,
  } satisfies Record<string, Status>;
}

const connected = (st: ReturnType<typeof statuses>) => Object.values(st).filter((x) => x.tone === 'ok' || x.tone === 'accent').length;

/** Seção "Squads e integrações" da página Meu perfil (VP: todos os squads; Tech Lead: o próprio). */
export function SquadsSection() {
  const { persona, session, filters, setFilters } = useApp();
  const all = useSquads();
  const usage = useUsage();
  const [editing, setEditing] = useState<Squad | 'new' | null>(null);
  const [removing, setRemoving] = useState<Squad | null>(null);

  const isVp = persona === 'vp';
  // Tech Lead vê e edita só o próprio squad
  const list = isVp ? all : all.filter((s) => s.id === session?.squadId);
  const rows = list.map((s) => ({ s, u: usage[s.id], st: statuses(s, usage[s.id]) }));

  const k = {
    squads: list.length,
    full: rows.filter((r) => connected(r.st) === 3).length,
    repos: rows.reduce((a, r) => a + (r.s.repos?.length ?? 0), 0),
    people: rows.reduce((a, r) => a + (r.u?.devs ?? 0), 0),
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Plug className="h-5 w-5 text-accent" /> Squads e integrações
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isVp ? 'Ligue cada squad' : 'Ligue o seu squad'} ao quadro do Jira, aos repositórios do GitHub e ao uso do Kiro. É daqui que o RADAR lê os
            dados de todas as abas. No protótipo, as conexões são simuladas e nenhuma credencial é pedida.
          </p>
        </div>
        {isVp && (
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Novo squad
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard index={0} icon={<Users className="h-3.5 w-3.5" />} label="Squads" value={k.squads} format={fmtInt} />
        <KpiCard index={1} icon={<Plug className="h-3.5 w-3.5" />} label="Com as 3 integrações" value={k.full} format={fmtInt}
          footnote="Jira, GitHub e Kiro" tone={k.full < k.squads ? 'warn' : undefined} />
        <KpiCard index={2} icon={<GitBranch className="h-3.5 w-3.5" />} label="Repositórios monitorados" value={k.repos} format={fmtInt} />
        <KpiCard index={3} label="Pessoas nos squads" value={k.people} format={fmtInt} />
      </div>

      <FadeIn delay={0.1} className="mt-4">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <div className="text-sm font-semibold">Squads</div>
            <div className="text-xs text-muted">{list.length} squad{list.length === 1 ? '' : 's'} · squads novos aparecem no filtro de squads assim que salvos</div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Squad</Th>
                  <Th className="text-right">Pessoas</Th>
                  <Th>Jira</Th>
                  <Th>GitHub</Th>
                  <Th>Kiro (AWS)</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, u, st }) => (
                  <tr key={s.id} className="hover:bg-surface-2/50">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                        <div>
                          <div className="font-medium text-text">
                            {s.name}
                            {s.custom && <Badge tone="accent" className="ml-2">novo</Badge>}
                          </div>
                          <div className="text-[11px] text-muted">TL: {s.techLead}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="num text-right">{u?.devs ?? 0}</Td>
                    <Td>
                      <IntegrationCell icon={<KanbanSquare className="h-3.5 w-3.5" />} detail={s.jiraProject ? `${s.jiraProject} · quadro ${s.jiraBoardId ?? '—'}` : '—'} status={st.jira} />
                    </Td>
                    <Td>
                      <IntegrationCell icon={<GitBranch className="h-3.5 w-3.5" />} detail={s.repos?.length ? `${s.repos.length} repositório${s.repos.length === 1 ? '' : 's'}` : '—'} status={st.github} title={s.repos?.join('\n')} />
                    </Td>
                    <Td>
                      <IntegrationCell icon={<Bot className="h-3.5 w-3.5" />} detail={s.kiro ? 'Coleta de uso' : '—'} status={st.kiro} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        {isVp && !isBaseSquad(s.id) && (
                          <Button variant="ghost" size="sm" className="hover:text-risk" onClick={() => setRemoving(s)} aria-label={`Remover ${s.name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>
      </FadeIn>

      {editing && (
        <SquadForm
          initial={editing === 'new' ? null : editing}
          taken={all.map((s) => s.id)}
          onClose={() => setEditing(null)}
          onSaved={(s, isNew) => {
            setEditing(null);
            toast.success(isNew ? `Squad ${s.name} cadastrado` : `Squad ${s.name} atualizado`, {
              description: isNew ? 'Já aparece no filtro de squads. Os dados entram na primeira sincronização.' : undefined,
              action: isNew ? { label: 'Filtrar', onClick: () => setFilters({ squadId: s.id }) } : undefined,
            });
          }}
        />
      )}

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        {removing && (
          <DialogContent
            title={`Remover o squad ${removing.name}?`}
            description="As integrações cadastradas para ele deixam de ser lidas pelo RADAR."
            footer={
              <>
                <Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button>
                <Button
                  variant="primary"
                  className="bg-risk hover:bg-risk/90"
                  onClick={() => {
                    if (filters.squadId === removing.id) setFilters({ squadId: 'all' });
                    removeSquad(removing.id);
                    toast(`Squad ${removing.name} removido`);
                    setRemoving(null);
                  }}
                >
                  Remover
                </Button>
              </>
            }
          >
            <p className="text-sm text-muted">Essa ação não afeta os dados no Jira nem no GitHub.</p>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

function IntegrationCell({ icon, detail, status, title }: { icon: React.ReactNode; detail: string; status: Status; title?: string }) {
  return (
    <div className="min-w-[150px]" title={title}>
      <div className="flex items-center gap-1.5 text-xs text-text">
        <span className="text-muted">{icon}</span>
        <span className="num">{detail}</span>
      </div>
      <Badge tone={status.tone} className="mt-1">{status.label}</Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
type Check = { label: string; ok: boolean; detail: string };

function SquadForm({ initial, taken, onClose, onSaved }: { initial: Squad | null; taken: string[]; onClose: () => void; onSaved: (s: Squad, isNew: boolean) => void }) {
  const isNew = !initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [techLead, setTechLead] = useState(initial?.techLead ?? '');
  const [color, setColor] = useState(initial?.color ?? COLORS[taken.length % COLORS.length]);
  const [jiraProject, setJiraProject] = useState(initial?.jiraProject ?? '');
  const [board, setBoard] = useState(initial?.jiraBoardId ? String(initial.jiraBoardId) : '');
  const [repos, setRepos] = useState((initial?.repos ?? []).join('\n'));
  const [kiro, setKiro] = useState(initial?.kiro ?? true);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [tried, setTried] = useState(false);

  const id = initial?.id ?? slugify(name);
  const repoList = repos.split(/[\n,]/).map((r) => r.trim()).filter(Boolean);
  const errors = {
    name: !name.trim() ? 'Informe o nome do squad.' : isNew && taken.includes(id) ? 'Já existe um squad com esse nome.' : !id ? 'Use letras ou números no nome.' : '',
    techLead: !techLead.trim() ? 'Informe o Tech Lead.' : '',
    jiraProject: jiraProject && !JIRA_KEY.test(jiraProject) ? 'Use a chave do projeto, ex.: CRPR (2 a 10 letras maiúsculas ou números).' : '',
    board: board && !/^\d{1,7}$/.test(board) ? 'O ID do quadro é numérico, ex.: 8075.' : '',
    repos: repoList.some((r) => !REPO.test(r)) ? 'Use o formato repositorio ou organizacao/repositorio, um por linha.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);

  const build = (checkedAt?: string): Squad => ({
    ...(initial ?? {}),
    id,
    name: name.trim(),
    techLead: techLead.trim(),
    color,
    jiraProject: jiraProject || undefined,
    jiraBoardId: board ? Number(board) : undefined,
    repos: repoList,
    kiro,
    checkedAt: checkedAt ?? initial?.checkedAt,
  });

  // validação simulada: confere formato e "encontra" o projeto, o quadro e os repositórios
  const test = () => {
    setTried(true);
    if (!valid) return;
    setTesting(true);
    setChecks(null);
    setTimeout(() => {
      const res: Check[] = [];
      res.push(
        jiraProject && board
          ? { label: 'Jira', ok: true, detail: `Projeto ${jiraProject} e quadro ${board} encontrados` }
          : { label: 'Jira', ok: false, detail: 'Informe a chave do projeto e o ID do quadro' },
      );
      res.push(
        repoList.length
          ? { label: 'GitHub', ok: true, detail: `Leitura liberada em ${repoList.length} repositório${repoList.length === 1 ? '' : 's'}` }
          : { label: 'GitHub', ok: false, detail: 'Nenhum repositório informado' },
      );
      res.push(kiro ? { label: 'Kiro (AWS)', ok: true, detail: 'Métricas de uso disponíveis para o squad' } : { label: 'Kiro (AWS)', ok: false, detail: 'Coleta desligada' });
      setChecks(res);
      setTesting(false);
    }, 700);
  };

  const save = () => {
    setTried(true);
    if (!valid) return;
    const allOk = checks?.every((c) => c.ok);
    const s = build(allOk ? new Date().toISOString() : undefined);
    saveSquad(s);
    onSaved(s, isNew);
  };

  const err = (k: keyof typeof errors) => tried && errors[k] && <p className="mt-1 text-xs text-risk">{errors[k]}</p>;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={isNew ? 'Novo squad' : `Editar ${initial!.name}`}
        description="Os dados do squad entram em todas as abas do RADAR a partir das integrações abaixo."
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="outline" onClick={test} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Testar conexões
            </Button>
            <Button variant="primary" onClick={save}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do squad">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Portal do Professor" disabled={!isNew && isBaseSquad(initial!.id)} />
              {err('name')}
            </Field>
            <Field label="Tech Lead">
              <Input value={techLead} onChange={(e) => setTechLead(e.target.value)} placeholder="Nome do Tech Lead" />
              {err('techLead')}
            </Field>
            <Field label="Cor nos gráficos" className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`}
                    className={cn('h-6 w-6 cursor-pointer rounded-full ring-offset-2 ring-offset-[var(--surface)]', color === c && 'ring-2 ring-accent')}
                    style={{ background: c }} />
                ))}
              </div>
            </Field>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><KanbanSquare className="h-3.5 w-3.5" /> Jira</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Chave do projeto">
                <Input value={jiraProject} onChange={(e) => setJiraProject(e.target.value.toUpperCase())} placeholder="Ex.: CRPR" className="num" />
                {err('jiraProject')}
              </Field>
              <Field label="ID do quadro (board)">
                <Input value={board} onChange={(e) => setBoard(e.target.value.replace(/\D/g, ''))} placeholder="Ex.: 8075" className="num" inputMode="numeric" />
                {err('board')}
              </Field>
            </div>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><GitBranch className="h-3.5 w-3.5" /> GitHub</h4>
            <Field label="Repositórios (um por linha)">
              <textarea value={repos} onChange={(e) => setRepos(e.target.value)} rows={3} placeholder={'cogna/portal-professor-web\ncogna/portal-professor-bff'}
                className="num w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20" />
              {err('repos')}
            </Field>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Bot className="h-3.5 w-3.5" /> Kiro (AWS)</h4>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={kiro} onChange={(e) => setKiro(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Coletar as métricas de uso do Kiro dos devs deste squad
            </label>
          </section>

          {checks && (
            <section className="rounded-lg border border-border bg-surface-2/60 p-3">
              <div className="mb-2 text-xs font-semibold text-text">Resultado do teste <span className="font-normal text-muted">(simulado)</span></div>
              <ul className="space-y-1.5">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2 text-sm">
                    {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : c.detail === 'Coleta desligada' ? <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />}
                    <span>
                      <b>{c.label}:</b> <span className="text-muted">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
