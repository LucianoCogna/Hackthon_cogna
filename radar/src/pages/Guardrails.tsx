import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JSZip from 'jszip';
import { toast } from 'sonner';
import {
  Archive,
  BookOpenCheck,
  Bot,
  Download,
  Eye,
  FileCode2,
  FlaskConical,
  GitPullRequest,
  Lock,
  Route,
  Ruler,
  Scissors,
  Settings2,
  Skull,
  Webhook,
  Workflow,
  Zap,
  Loader2,
} from 'lucide-react';
import { FadeIn, PageHeader } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/overlay';
import { fmtDate } from '@/lib/format';
import { REF_DATE, addDays } from '@/mocks/sprints';

type Guardrail = { file: string; title: string; description: string; tags: string[]; updated: string; icon: React.ElementType; minutes: number };

const GUARDRAILS: Guardrail[] = [
  { file: '01-escolha-de-modelo.md', title: 'Escolha de modelo', description: 'Tabela tarefa → modelo e a regra de nunca usar o modelo mais caro para commit ou perguntas simples.', tags: ['custo', 'modelos', 'governança'], updated: addDays(REF_DATE, -3), icon: Route, minutes: 3 },
  { file: '02-spec-driven-development.md', title: 'Spec-driven development', description: 'Fluxo requirements → design → tasks, quando usar spec ou chat, e templates EARS e Dado-Quando-Então.', tags: ['specs', 'requisitos', 'AI-DLC'], updated: addDays(REF_DATE, -6), icon: Workflow, minutes: 4 },
  { file: '03-steering-files.md', title: 'Steering files', description: 'Como criar .kiro/steering/ com exemplos prontos de product.md, tech.md e structure.md.', tags: ['steering', 'contexto', 'padrões'], updated: addDays(REF_DATE, -9), icon: Settings2, minutes: 3 },
  { file: '04-hooks-e-automacoes.md', title: 'Hooks e automações', description: 'Hooks para tarefas determinísticas (lint, testes, commit por template) sem gastar LLM.', tags: ['hooks', 'custo', 'automação'], updated: addDays(REF_DATE, -2), icon: Webhook, minutes: 3 },
  { file: '05-pr-e-revisao.md', title: 'PR e revisão', description: 'Tamanho máximo de PR, checklist de revisão de código gerado por IA, % de IA e tempo mínimo de revisão.', tags: ['PR', 'qualidade', 'revisão'], updated: addDays(REF_DATE, -1), icon: GitPullRequest, minutes: 4 },
  { file: '06-testes-no-ai-dlc.md', title: 'Testes no AI-DLC', description: 'Harness de testes, testes antes da implementação, cobertura mínima e a regra de não aceitar código sem teste.', tags: ['testes', 'qualidade'], updated: addDays(REF_DATE, -12), icon: FlaskConical, minutes: 3 },
  { file: '07-seguranca-e-dados.md', title: 'Segurança e dados', description: 'Sem secrets ou PII em prompts, revisão de dependências sugeridas e cuidados com dados de alunos (LGPD).', tags: ['segurança', 'LGPD'], updated: addDays(REF_DATE, -15), icon: Lock, minutes: 4 },
  { file: '08-anti-padroes.md', title: 'Anti-padrões', description: 'IA como mordomo, aceitar diff sem ler, prompts vagos e conversas gigantes sem reset de contexto.', tags: ['boas práticas', 'cultura'], updated: addDays(REF_DATE, -4), icon: Skull, minutes: 4 },
];

const QUICK_WINS = [
  { icon: Zap, title: 'Commit com Haiku ou hook', text: 'Mensagem de commit nunca precisa do modelo de topo. Um hook com template custa R$ 0.' },
  { icon: Ruler, title: 'PR de até ~400 linhas', text: 'Uma task da spec, um PR. A revisão fica viável e a aderência sobe.' },
  { icon: BookOpenCheck, title: 'Critério → teste', text: 'Peça os testes a partir dos critérios de aceite antes de pedir o código.' },
  { icon: Scissors, title: 'Reset de contexto', text: 'Uma conversa por assunto. Conversas longas custam mais e erram mais.' },
  { icon: FileCode2, title: 'Steering no repositório', text: 'product.md, tech.md e structure.md evitam repetir o mesmo contexto em todo prompt.' },
];

const url = (f: string) => `${import.meta.env.BASE_URL}guardrails/${f}`;

export default function Guardrails() {
  const [viewing, setViewing] = useState<Guardrail | null>(null);
  const [content, setContent] = useState('');
  const [zipping, setZipping] = useState(false);

  const open = async (g: Guardrail) => {
    setViewing(g);
    setContent('');
    try {
      const r = await fetch(url(g.file));
      setContent(await r.text());
    } catch {
      setContent('Não foi possível carregar o arquivo.');
    }
  };

  const downloadAll = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('guardrails-kiro')!;
      await Promise.all(
        GUARDRAILS.map(async (g) => {
          const r = await fetch(url(g.file));
          folder.file(g.file, await r.text());
        }),
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'guardrails-kiro-vptech.zip';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast.success('guardrails-kiro-vptech.zip baixado', { description: `${GUARDRAILS.length} arquivos .md` });
    } catch {
      toast.error('Não foi possível gerar o .zip');
    } finally {
      setZipping(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Guardrails & Skills do Kiro"
        title="Central de boas práticas"
        subtitle="Guias curtos para usar o Kiro com qualidade e custo certo. Baixe os .md e coloque no seu repositório ou nos steering files."
        actions={
          <Button variant="primary" onClick={downloadAll} disabled={zipping}>
            {zipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Baixar todos (.zip)
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {GUARDRAILS.map((g, i) => {
          const Icon = g.icon;
          return (
            <FadeIn key={g.file} delay={i * 0.04}>
              <Card className="card-glow group flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="num text-[11px] text-muted">{g.file.slice(0, 2)}</span>
                </div>
                <div className="mt-3 text-sm font-semibold">{g.title}</div>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{g.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {g.tags.map((t) => (
                    <Badge key={t}>{t}</Badge>
                  ))}
                </div>
                <div className="num mt-3 text-[11px] text-muted">
                  Atualizado em {fmtDate(g.updated)} · {g.minutes} min de leitura
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="subtle" className="flex-1" onClick={() => open(g)}>
                    <Eye className="h-3.5 w-3.5" /> Visualizar
                  </Button>
                  <a
                    href={url(g.file)}
                    download={g.file}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:border-accent/60 hover:bg-accent-soft"
                    onClick={() => toast.success(`${g.file} baixado`)}
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar .md
                  </a>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold">
        <Zap className="h-4 w-4 text-warn" /> Quick wins
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {QUICK_WINS.map((q, i) => {
          const Icon = q.icon;
          return (
            <FadeIn key={q.title} delay={0.3 + i * 0.04}>
              <Card className="card-glow h-full p-4">
                <Icon className="h-5 w-5 text-ai" />
                <div className="mt-2 text-sm font-semibold">{q.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{q.text}</p>
              </Card>
            </FadeIn>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
        <Bot className="h-4 w-4 text-accent" />
        Os recursos do Kiro (specs, steering, hooks) evoluem rápido. Valide os nomes e opções na documentação oficial antes de aplicar.
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        {viewing && (
          <DialogContent
            className="max-w-3xl"
            title={viewing.title}
            description={<span className="num">{viewing.file}</span>}
            footer={
              <a
                href={url(viewing.file)}
                download={viewing.file}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-strong"
              >
                <Download className="h-4 w-4" /> Baixar .md
              </a>
            }
          >
            {content ? (
              <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-accent prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-surface-2 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-pre:border prose-pre:border-border prose-pre:bg-bg prose-table:text-xs prose-th:text-left">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </article>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
