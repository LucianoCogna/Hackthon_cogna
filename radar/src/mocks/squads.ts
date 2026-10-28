import type { Squad } from './types';

export const squads: Squad[] = [
  { id: 'pricing', name: 'Pricing', techLead: 'Helena Duarte', color: '#4CA0CB' },
  { id: 'midia', name: 'Mídia', techLead: 'Rodrigo Saraiva', color: '#CC148F' },
  { id: 'vendas', name: 'Vendas', techLead: 'Camila Rezende', color: '#D25D04' },
  { id: 'financeiro', name: 'Financeiro', techLead: 'Bruno Tavares', color: '#1A934D' },
  { id: 'plataforma', name: 'Plataforma', techLead: 'Marina Coutinho', color: '#0C81C0' },
  { id: 'dados', name: 'Dados', techLead: 'Thiago Nogueira', color: '#A97E19' },
  { id: 'academico', name: 'Acadêmico', techLead: 'Patrícia Moraes', color: '#61A711' },
  { id: 'portal', name: 'Portal do Aluno', techLead: 'Diego Albuquerque', color: '#0791A6' },
];

export const squadById = Object.fromEntries(squads.map((s) => [s.id, s])) as Record<string, Squad>;

/** Perfil de comportamento por squad (usado pelo gerador para contar a história). */
export const squadProfile: Record<
  string,
  { aiBias: number; fastReview: boolean; assistedReview: boolean; specBias: number }
> = {
  pricing: { aiBias: 0.05, fastReview: false, assistedReview: false, specBias: 4 },
  midia: { aiBias: 0.18, fastReview: true, assistedReview: false, specBias: -10 },
  vendas: { aiBias: 0.2, fastReview: true, assistedReview: false, specBias: -14 },
  financeiro: { aiBias: 0.02, fastReview: false, assistedReview: true, specBias: 8 },
  plataforma: { aiBias: 0.1, fastReview: false, assistedReview: true, specBias: 10 },
  dados: { aiBias: 0.06, fastReview: false, assistedReview: true, specBias: 5 },
  academico: { aiBias: -0.04, fastReview: false, assistedReview: false, specBias: -2 },
  portal: { aiBias: 0.04, fastReview: false, assistedReview: false, specBias: 0 },
};

export const squadRepos: Record<string, string[]> = {
  pricing: ['pricing-engine', 'pricing-rules-api'],
  midia: ['midia-campanhas', 'midia-tracking-sdk'],
  vendas: ['vendas-checkout-api', 'vendas-crm-bridge'],
  financeiro: ['fin-boletos', 'fin-conciliacao'],
  plataforma: ['platform-devhub', 'platform-infra-modules'],
  dados: ['data-lake-pipelines', 'data-dbt-models'],
  academico: ['acad-matriculas', 'acad-notas-service'],
  portal: ['portal-aluno-web', 'portal-aluno-bff'],
};
