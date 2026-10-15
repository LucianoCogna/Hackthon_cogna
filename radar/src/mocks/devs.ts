import type { Dev, Seniority } from './types';
import { squads } from './squads';
import { createRng } from './seed';

// Nomes fictícios
const names = [
  'Ana Clara Mendes', 'Lucas Ferraz', 'Beatriz Lacerda', 'Gustavo Pimentel', 'Juliana Barros',
  'Rafael Quintana', 'Larissa Fontes', 'Mateus Arantes', 'Fernanda Viana', 'Pedro Henrique Lobo',
  'Isabela Campos', 'Felipe Moura', 'Carolina Seixas', 'Vinícius Prado', 'Letícia Amaral',
  'João Victor Brandão', 'Natália Godoy', 'Eduardo Pacheco', 'Amanda Teles', 'Leonardo Bastos',
  'Gabriela Siqueira', 'Henrique Damasceno', 'Mariana Cordeiro', 'Caio Rangel', 'Priscila Antunes',
  'André Valadares', 'Renata Falcão', 'Murilo Peixoto', 'Bianca Rocha', 'Otávio Meireles',
  'Sofia Guimarães', 'Daniel Furtado', 'Yasmin Carvalhal', 'Igor Montenegro', 'Lívia Pedrosa',
  'Samuel Coelho', 'Tatiana Brito', 'Ricardo Leal', 'Vanessa Sampaio',
];

const seniorities: Seniority[] = ['Jr', 'Pl', 'Pl', 'Sr', 'Sr', 'Esp'];

export type DevTraits = {
  /** propensão a usar modelos caros em tarefas triviais (0–1) */
  waste: number;
  /** maturidade no Kiro: aceitação, spec-driven, skills (0–1) */
  kiroSkill: number;
  /** afinidade com geração por IA (−0.2 a +0.2) */
  aiAffinity: number;
  /** produtividade relativa */
  output: number;
};

const rng = createRng(4242);
let n = 0;

export const devs: Dev[] = [];
export const devTraits: Record<string, DevTraits> = {};

for (const sq of squads) {
  for (let i = 0; i < 6; i++) {
    const isTL = i === 0;
    const isMe = sq.id === 'portal' && i === 3;
    const name = isTL ? sq.techLead : isMe ? 'Você' : names[n++ % names.length];
    const id = isMe ? 'me' : `${sq.id}-${i}`;
    devs.push({
      id,
      name,
      avatarSeed: name,
      squadId: sq.id,
      seniority: isTL ? 'Esp' : isMe ? 'Pl' : seniorities[(i + n) % seniorities.length],
      role: isTL ? 'Tech Lead' : 'Dev',
      isMe,
    });
    devTraits[id] = {
      waste: rng.bool(0.22) ? rng.float(0.45, 0.85) : rng.float(0, 0.18),
      kiroSkill: rng.float(0.25, 0.98),
      aiAffinity: rng.float(-0.2, 0.2),
      output: rng.float(0.75, 1.3) * (isTL ? 0.7 : 1),
    };
  }
}

// Os 3 Kiro Champions têm traços fortes e consistentes
for (const id of ['plataforma-2', 'dados-1', 'financeiro-3']) {
  devTraits[id] = { ...devTraits[id], waste: 0.02, kiroSkill: 0.99 };
}
devTraits['me'] = { waste: 0.25, kiroSkill: 0.62, aiAffinity: 0.05, output: 1.05 };

export const devById = Object.fromEntries(devs.map((d) => [d.id, d])) as Record<string, Dev>;
export const ME_ID = 'me';
