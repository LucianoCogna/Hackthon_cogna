import type { Epic } from './types';
import { sprints, addDays } from './sprints';

const s = (i: number) => sprints[i].start;
const e = (i: number) => sprints[i].end;

export const epics: Epic[] = [
  { key: 'PRC-E1', name: 'Motor de preços 2.0', squadId: 'pricing', owner: 'Helena Duarte', status: 'No prazo', progressPct: 72, plannedStart: s(6), plannedEnd: addDays(e(13), 28), forecastEnd: addDays(e(13), 28), risks: ['Validação jurídica das faixas de desconto'] },
  { key: 'PRC-E2', name: 'Preços por polo', squadId: 'pricing', owner: 'Lucas Ferraz', status: 'Entregue', progressPct: 100, plannedStart: s(2), plannedEnd: e(10), forecastEnd: e(10), risks: [] },
  { key: 'MID-E1', name: 'Atribuição multicanal', squadId: 'midia', owner: 'Rodrigo Saraiva', status: 'Atenção', progressPct: 54, plannedStart: s(7), plannedEnd: addDays(e(13), 14), forecastEnd: addDays(e(13), 35), risks: ['Mudança na API de anúncios', 'Hotfixes recorrentes no tracking'] },
  { key: 'MID-E2', name: 'Consentimento LGPD no tracking', squadId: 'midia', owner: 'Fernanda Viana', status: 'No prazo', progressPct: 81, plannedStart: s(9), plannedEnd: addDays(e(13), 10), forecastEnd: addDays(e(13), 10), risks: [] },
  { key: 'VEN-E1', name: 'Novo checkout de matrícula', squadId: 'vendas', owner: 'Camila Rezende', status: 'Atrasado', progressPct: 63, plannedStart: s(6), plannedEnd: e(13), forecastEnd: addDays(e(13), 30), risks: ['Critérios de aceite não atendidos em PRs grandes', 'Taxa de hotfix acima da média', 'Dependência do time Financeiro (Pix)'] },
  { key: 'VEN-E2', name: 'Integração CRM', squadId: 'vendas', owner: 'Gabriela Siqueira', status: 'Atenção', progressPct: 47, plannedStart: s(8), plannedEnd: addDays(e(13), 21), forecastEnd: addDays(e(13), 42), risks: ['Fornecedor do CRM sem ambiente de homologação'] },
  { key: 'FIN-E1', name: 'Conciliação automática', squadId: 'financeiro', owner: 'Bruno Tavares', status: 'No prazo', progressPct: 88, plannedStart: s(5), plannedEnd: addDays(e(13), 7), forecastEnd: addDays(e(13), 7), risks: [] },
  { key: 'FIN-E2', name: 'NFS-e automática', squadId: 'financeiro', owner: 'Mariana Cordeiro', status: 'Entregue', progressPct: 100, plannedStart: s(3), plannedEnd: e(11), forecastEnd: e(11), risks: [] },
  { key: 'PLT-E1', name: 'Dev Hub self-service', squadId: 'plataforma', owner: 'Marina Coutinho', status: 'No prazo', progressPct: 76, plannedStart: s(4), plannedEnd: addDays(e(13), 21), forecastEnd: addDays(e(13), 21), risks: ['Chamados de infra ainda manuais para filas SQS'] },
  { key: 'PLT-E2', name: 'Observabilidade padrão', squadId: 'plataforma', owner: 'Caio Rangel', status: 'Atenção', progressPct: 58, plannedStart: s(7), plannedEnd: addDays(e(13), 14), forecastEnd: addDays(e(13), 28), risks: ['Custo de ingestão de logs acima do previsto'] },
  { key: 'DAD-E1', name: 'Lake de matrículas', squadId: 'dados', owner: 'Thiago Nogueira', status: 'No prazo', progressPct: 69, plannedStart: s(5), plannedEnd: addDays(e(13), 28), forecastEnd: addDays(e(13), 28), risks: [] },
  { key: 'DAD-E2', name: 'Modelo de evasão', squadId: 'dados', owner: 'Priscila Antunes', status: 'Entregue', progressPct: 100, plannedStart: s(4), plannedEnd: e(12), forecastEnd: e(12), risks: [] },
  { key: 'ACD-E1', name: 'Diário de classe digital', squadId: 'academico', owner: 'Patrícia Moraes', status: 'Atenção', progressPct: 44, plannedStart: s(6), plannedEnd: addDays(e(13), 14), forecastEnd: addDays(e(13), 40), risks: ['Spec com critérios ambíguos: 3 histórias reabertas', 'Baixa adoção do Kiro no squad'] },
  { key: 'ACD-E2', name: 'Rematrícula online', squadId: 'academico', owner: 'Otávio Meireles', status: 'No prazo', progressPct: 66, plannedStart: s(9), plannedEnd: addDays(e(13), 35), forecastEnd: addDays(e(13), 35), risks: [] },
  { key: 'PTL-E1', name: 'Nova home do Portal', squadId: 'portal', owner: 'Diego Albuquerque', status: 'No prazo', progressPct: 79, plannedStart: s(7), plannedEnd: addDays(e(13), 14), forecastEnd: addDays(e(13), 14), risks: ['Meta de acessibilidade WCAG AA'] },
  { key: 'PTL-E2', name: 'Login social', squadId: 'portal', owner: 'Sofia Guimarães', status: 'Atrasado', progressPct: 38, plannedStart: s(8), plannedEnd: e(13), forecastEnd: addDays(e(13), 35), risks: ['Aprovação de segurança para MFA pendente', 'Dependência do provedor de identidade'] },
];

export const meetingRisks = [
  { id: 'r1', text: 'Dependência de infra para provisionar fila SQS', source: 'Daily Plataforma + Vendas', mentions: 3, squadId: 'vendas', severity: 'alta' as const, when: 'esta semana' },
  { id: 'r2', text: 'Aprovação de segurança do MFA ainda sem data', source: 'Refinamento Portal do Aluno', mentions: 2, squadId: 'portal', severity: 'alta' as const, when: 'esta semana' },
  { id: 'r3', text: 'Critérios de aceite do diário de classe mudaram após a sprint começar', source: 'Review Acadêmico', mentions: 4, squadId: 'academico', severity: 'média' as const, when: 'últimos 10 dias' },
  { id: 'r4', text: 'Overage de licenças do Kiro previsto para o fim do mês', source: 'Comitê de IA', mentions: 2, squadId: 'plataforma', severity: 'média' as const, when: 'esta semana' },
  { id: 'r5', text: 'Hotfix em produção no tracking de campanhas (2ª vez no mês)', source: 'Incidente #INC-2291', mentions: 5, squadId: 'midia', severity: 'alta' as const, when: 'últimos 10 dias' },
  { id: 'r6', text: 'Ambiente de homologação do CRM indisponível', source: '1:1 Tech Lead Vendas', mentions: 2, squadId: 'vendas', severity: 'média' as const, when: 'últimos 10 dias' },
  { id: 'r7', text: 'Custo de ingestão de logs 30% acima do previsto', source: 'FinOps semanal', mentions: 1, squadId: 'plataforma', severity: 'baixa' as const, when: 'este mês' },
];

/** Outer loop: tempo médio de chamado de infra (horas) por sprint. */
export const infraTicketHours: number[] = [62, 58, 64, 57, 52, 49, 46, 44, 41, 38, 36, 35, 33, 31];
