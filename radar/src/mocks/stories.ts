import type { Story, StoryStatus } from './types';
import { squads, squadProfile } from './squads';
import { sprints } from './sprints';
import { aiPhase } from './milestones';
import { createRng, clamp, hashString } from './seed';

/** [texto do critério, rótulo curto usado nas notas da análise] */
type Crit = [string, string];
type Template = { title: string; criteria: Crit[] };

export const squadPrefix: Record<string, string> = {
  pricing: 'PRC', midia: 'MID', vendas: 'VEN', financeiro: 'FIN',
  plataforma: 'PLT', dados: 'DAD', academico: 'ACD', portal: 'PTL',
};

const T: Record<string, Template[]> = {
  pricing: [
    { title: 'Regra de desconto progressivo por volume de matrículas', criteria: [['Aplicar faixa de desconto conforme quantidade de matrículas', 'faixas de desconto'], ['Bloquear desconto acima do teto definido pelo comercial', 'teto de desconto'], ['Registrar histórico de alteração de preço', 'histórico de preço']] },
    { title: 'Simulador de mensalidade para o site', criteria: [['Calcular valor final com bolsa e desconto', 'cálculo do valor final'], ['Exibir parcelamento em até 12x', 'parcelamento'], ['Responder em menos de 300 ms (p95)', 'latência p95'], ['Cachear tabela de preços por 5 minutos', 'cache da tabela']] },
    { title: 'Versionamento de tabela de preços por polo', criteria: [['Criar nova versão sem sobrescrever a vigente', 'versão nova'], ['Agendar início de vigência', 'agendamento de vigência'], ['Permitir rollback para versão anterior', 'rollback']] },
    { title: 'API de preço para campanhas promocionais', criteria: [['Expor endpoint GET /precos/campanha/{id}', 'endpoint de campanha'], ['Validar período da campanha', 'período da campanha'], ['Retornar 404 para campanha inexistente', 'erro 404'], ['Documentar contrato no OpenAPI', 'contrato OpenAPI']] },
    { title: 'Auditoria de mudanças de preço', criteria: [['Registrar usuário, data e valor anterior', 'trilha de auditoria'], ['Exportar relatório em CSV', 'exportação CSV'], ['Restringir acesso ao perfil Financeiro', 'controle de acesso']] },
  ],
  midia: [
    { title: 'Pixel de conversão para campanhas de captação', criteria: [['Disparar evento de lead no envio do formulário', 'evento de lead'], ['Respeitar consentimento de cookies (LGPD)', 'consentimento LGPD'], ['Deduplicar eventos por sessão', 'deduplicação']] },
    { title: 'Painel de performance de campanhas por canal', criteria: [['Exibir CPL por canal', 'CPL por canal'], ['Filtrar por período e curso', 'filtros'], ['Atualizar dados a cada hora', 'atualização horária'], ['Exportar para planilha', 'exportação']] },
    { title: 'Integração com API de anúncios para custo diário', criteria: [['Importar custo diário por campanha', 'importação de custo'], ['Tratar limite de requisições da API', 'rate limit'], ['Alertar falha de importação no Slack', 'alerta de falha']] },
    { title: 'UTM padronizada no gerador de links', criteria: [['Gerar UTM com taxonomia oficial', 'taxonomia UTM'], ['Validar campos obrigatórios', 'validação de campos'], ['Encurtar link gerado', 'encurtador']] },
    { title: 'Segmentação de público para remarketing', criteria: [['Criar segmento por etapa do funil', 'segmento por funil'], ['Excluir alunos já matriculados', 'exclusão de matriculados'], ['Sincronizar segmento diariamente', 'sincronização diária'], ['Anonimizar dados pessoais no export', 'anonimização']] },
  ],
  vendas: [
    { title: 'Checkout com cupom de desconto e validação de CPF', criteria: [['Aplicar cupom válido e recalcular o total', 'aplicação de cupom'], ['Validar CPF do comprador antes de gerar o pedido', 'validação de CPF'], ['Exibir erro amigável para cupom expirado', 'erro de cupom expirado'], ['Registrar evento de conversão no analytics', 'evento de conversão']] },
    { title: 'Pré-matrícula com reserva de vaga', criteria: [['Reservar vaga por 48 horas', 'reserva de 48h'], ['Liberar vaga automaticamente ao expirar', 'liberação automática'], ['Enviar e-mail de confirmação', 'e-mail de confirmação']] },
    { title: 'Integração do CRM com funil de vendas', criteria: [['Sincronizar lead em até 1 minuto', 'sincronização de lead'], ['Mapear etapa do funil para status do CRM', 'mapeamento de etapas'], ['Reprocessar falhas automaticamente', 'reprocessamento'], ['Registrar log de integração', 'log de integração']] },
    { title: 'Link de pagamento via Pix', criteria: [['Gerar QR Code Pix com expiração', 'QR Code com expiração'], ['Confirmar pagamento por webhook', 'webhook de confirmação'], ['Tratar pagamento duplicado', 'pagamento duplicado']] },
    { title: 'Carrinho abandonado com lembrete', criteria: [['Detectar carrinho inativo por 2 horas', 'detecção de abandono'], ['Enviar lembrete por e-mail e WhatsApp', 'lembrete multicanal'], ['Respeitar opt-out do usuário', 'opt-out'], ['Medir taxa de recuperação', 'taxa de recuperação']] },
  ],
  financeiro: [
    { title: 'Emissão de boleto registrado com novo banco', criteria: [['Registrar boleto na API do banco', 'registro do boleto'], ['Tratar retorno de rejeição', 'rejeição'], ['Gerar PDF com linha digitável', 'PDF do boleto']] },
    { title: 'Conciliação automática de recebimentos', criteria: [['Importar arquivo de retorno CNAB', 'importação CNAB'], ['Conciliar por nosso número', 'conciliação'], ['Sinalizar divergências para análise', 'divergências'], ['Gerar relatório diário', 'relatório diário']] },
    { title: 'Renegociação de dívida no portal', criteria: [['Simular parcelas com juros', 'simulação de parcelas'], ['Aplicar política de desconto por atraso', 'política de desconto'], ['Gerar novo contrato de acordo', 'contrato de acordo']] },
    { title: 'Nota fiscal de serviço automática', criteria: [['Emitir NFS-e após confirmação de pagamento', 'emissão de NFS-e'], ['Reenviar em caso de indisponibilidade da prefeitura', 'reenvio'], ['Armazenar XML por 5 anos', 'retenção do XML']] },
    { title: 'Painel de inadimplência por curso', criteria: [['Calcular inadimplência por curso e polo', 'cálculo de inadimplência'], ['Exibir evolução mensal', 'evolução mensal'], ['Restringir acesso por perfil', 'controle de acesso'], ['Exportar para Excel', 'exportação']] },
  ],
  plataforma: [
    { title: 'Template de repositório com pipeline padrão', criteria: [['Criar repositório com CI de lint, testes e build', 'pipeline padrão'], ['Incluir steering files do Kiro', 'steering files'], ['Configurar proteção de branch', 'proteção de branch']] },
    { title: 'Provisionamento self-service de fila SQS', criteria: [['Solicitar fila pelo Dev Hub', 'solicitação no Dev Hub'], ['Provisionar via módulo Terraform', 'módulo Terraform'], ['Aplicar tags de custo obrigatórias', 'tags de custo'], ['Notificar o solicitante ao concluir', 'notificação']] },
    { title: 'Catálogo de serviços no Dev Hub', criteria: [['Listar serviços com owner e squad', 'listagem com owner'], ['Exibir status de saúde do serviço', 'status de saúde'], ['Buscar por nome e tag', 'busca']] },
    { title: 'Observabilidade padrão com OpenTelemetry', criteria: [['Instrumentar traces HTTP automaticamente', 'traces HTTP'], ['Exportar métricas para o coletor central', 'exportação de métricas'], ['Propagar correlation-id entre serviços', 'correlation-id']] },
    { title: 'Gestão de secrets centralizada', criteria: [['Ler secrets do Secrets Manager no boot', 'leitura de secrets'], ['Rotacionar credenciais sem downtime', 'rotação'], ['Bloquear secrets em texto plano no repositório', 'bloqueio de texto plano'], ['Auditar acessos', 'auditoria']] },
  ],
  dados: [
    { title: 'Pipeline incremental de matrículas para o lake', criteria: [['Carregar apenas registros alterados', 'carga incremental'], ['Garantir idempotência no reprocessamento', 'idempotência'], ['Registrar métricas de qualidade de dados', 'qualidade de dados']] },
    { title: 'Modelo dbt de evasão de alunos', criteria: [['Criar modelo com testes de unicidade', 'testes de unicidade'], ['Documentar colunas no catálogo', 'documentação'], ['Agendar execução diária', 'agendamento'], ['Mascarar dados pessoais', 'mascaramento de PII']] },
    { title: 'Feature store para modelo de propensão', criteria: [['Disponibilizar features via API', 'API de features'], ['Versionar features', 'versionamento'], ['Monitorar drift semanalmente', 'monitoramento de drift']] },
    { title: 'Data contract para eventos de vendas', criteria: [['Definir schema em Avro', 'schema Avro'], ['Validar eventos na ingestão', 'validação na ingestão'], ['Rejeitar eventos fora do contrato', 'rejeição fora do contrato']] },
  ],
  academico: [
    { title: 'Lançamento de notas em lote pelo professor', criteria: [['Importar notas por planilha', 'importação por planilha'], ['Validar faixa de 0 a 10', 'validação da faixa'], ['Registrar log de alteração', 'log de alteração'], ['Notificar coordenação ao fechar diário', 'notificação']] },
    { title: 'Rematrícula online com validação de pendências', criteria: [['Bloquear rematrícula com pendência financeira', 'bloqueio por pendência'], ['Exibir disciplinas disponíveis', 'disciplinas disponíveis'], ['Gerar comprovante', 'comprovante']] },
    { title: 'Grade horária com detecção de conflito', criteria: [['Detectar choque de horário', 'detecção de conflito'], ['Sugerir turma alternativa', 'sugestão de turma'], ['Respeitar pré-requisitos', 'pré-requisitos']] },
    { title: 'Histórico escolar digital', criteria: [['Gerar PDF assinado digitalmente', 'assinatura digital'], ['Validar autenticidade por QR Code', 'QR Code de validação'], ['Disponibilizar em até 24h', 'SLA de 24h']] },
  ],
  portal: [
    { title: 'Nova home do Portal do Aluno', criteria: [['Exibir próximas aulas e entregas', 'próximas aulas'], ['Carregar em menos de 2s no 4G', 'performance 4G'], ['Atender WCAG AA', 'acessibilidade AA'], ['Registrar eventos de navegação', 'eventos de navegação']] },
    { title: 'Segunda via de boleto no app', criteria: [['Listar boletos em aberto', 'listagem de boletos'], ['Copiar linha digitável', 'cópia da linha digitável'], ['Gerar Pix como alternativa', 'Pix alternativo']] },
    { title: 'Central de notificações do aluno', criteria: [['Agrupar notificações por tipo', 'agrupamento'], ['Marcar como lida', 'marcar como lida'], ['Enviar push para eventos críticos', 'push crítico']] },
    { title: 'Login com conta Google e Microsoft', criteria: [['Autenticar via OAuth 2.0', 'OAuth 2.0'], ['Vincular conta existente pelo e-mail', 'vínculo de conta'], ['Exigir MFA para alteração de dados', 'MFA'], ['Registrar auditoria de login', 'auditoria de login']] },
    { title: 'Solicitação de documentos acadêmicos', criteria: [['Solicitar declaração de matrícula', 'declaração'], ['Acompanhar status da solicitação', 'status'], ['Notificar quando disponível', 'notificação']] },
  ],
};

const variants = ['', ' — fase 2', ' (ajustes)', ' — MVP', ' — melhorias', ' (v2)'];

export const HERO_STORY_KEY = 'VEN-412';

const rng = createRng(1717);
export const stories: Story[] = [];
/** rótulos curtos dos critérios, por história (usados nas notas da análise por IA) */
export const criteriaTags: Record<string, string[]> = {};

const counters: Record<string, number> = {};

for (const sq of squads) {
  counters[sq.id] = 101 + rng.int(0, 60);
  const prof = squadProfile[sq.id];
  const templates = T[sq.id];
  for (const sp of sprints) {
    const p = aiPhase(sp.index);
    const isLast = sp.index === sprints.length - 1;
    const count = Math.round(5 + 3 * p + rng.float(-0.6, 1.4));
    for (let i = 0; i < count; i++) {
      const tpl = templates[(sp.index * 3 + i) % templates.length];
      const variant = variants[(sp.index + i) % variants.length];
      let key = `${squadPrefix[sq.id]}-${counters[sq.id]++}`;
      const specQuality = Math.round(clamp(rng.normal(70 + prof.specBias + 6 * p, 13), 22, 98));
      const reopen =
        specQuality < 50 ? rng.int(1, 3) : specQuality < 65 ? rng.int(0, 2) : rng.bool(0.12) ? 1 : 0;
      let status: StoryStatus = 'Done';
      if (isLast) status = rng.weighted([['Done', 74], ['In Progress', 20], ['To Do', 6]] as const);
      else if (sp.index === sprints.length - 2) status = rng.bool(0.88) ? 'Done' : 'In Progress';
      const points = rng.weighted([[1, 8], [2, 14], [3, 24], [5, 26], [8, 16], [13, 6]] as const);
      let title = tpl.title + variant;
      let criteria = tpl.criteria;
      if (isLast && sq.id === 'vendas' && i === 0) {
        key = HERO_STORY_KEY;
        title = T.vendas[0].title;
        criteria = T.vendas[0].criteria;
        status = 'In Progress';
      }
      stories.push({
        key,
        title,
        squadId: sq.id,
        sprintId: sp.id,
        points: key === HERO_STORY_KEY ? 8 : points,
        status,
        acceptanceCriteria: criteria.map((c) => c[0]),
        epicKey: `${squadPrefix[sq.id]}-E${(sp.index + i) % 2 === 0 ? 1 : 2}`,
        specQuality: key === HERO_STORY_KEY ? 41 : specQuality,
        reopenCount: key === HERO_STORY_KEY ? 2 : reopen,
      });
      criteriaTags[key] = criteria.map((c) => c[1]);
    }
  }
}

export const storyByKey = Object.fromEntries(stories.map((s) => [s.key, s])) as Record<string, Story>;

/**
 * Ruído determinístico por critério (fixo por história), para que a auditoria da história
 * e as notas de cada PR contem a mesma versão dos fatos.
 */
export function criterionOffsets(storyKey: string, n: number): number[] {
  if (storyKey === HERO_STORY_KEY) return [62, -30, 38, -12];
  return Array.from({ length: n }, (_, i) => ((hashString(storyKey + ':' + i) % 1000) / 1000) * 64 - 26);
}

export type CriterionStatus = 'ok' | 'partial' | 'missing';
export function criterionStatuses(storyKey: string, n: number, adherence: number): CriterionStatus[] {
  return criterionOffsets(storyKey, n).map((o) => {
    const s = adherence + o;
    return s >= 75 ? 'ok' : s >= 52 ? 'partial' : 'missing';
  });
}

/** Demanda nova que chega ao backlog por sprint (pontos), crescente: a demanda reprimida. */
export const incomingDemand: number[] = sprints.map((s) => Math.round(255 + s.index * 9 + rng.float(-12, 12)));
export const initialBacklog = 1480;
