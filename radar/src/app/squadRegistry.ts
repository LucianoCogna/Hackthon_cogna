// Cadastro de squads e integrações (tela /squads). Protótipo: fica salvo no navegador.
// Os squads cadastrados entram nas mesmas listas usadas pelo app (squads / squadById),
// então aparecem nos filtros e nas abas, ainda sem dados até a primeira sincronização.
import { useSyncExternalStore } from 'react';
import type { Squad } from '@/mocks/types';
import { squads, squadById, squadRepos } from '@/mocks/squads';
// os geradores do mock percorrem `squads` ao carregar: precisam rodar antes de entrarem squads novos
import { squadPrefix } from '@/mocks/stories';
import '@/mocks/devs';
import '@/mocks/prs';
import '@/mocks/kiro';
import { hashString } from '../../shared/random';

const KEY = 'radar.squads';
type Saved = { custom: Squad[]; edits: Record<string, Partial<Squad>> };

// integrações dos squads do mock, coerentes com os dados simulados
for (const s of squads) {
  s.jiraProject ??= squadPrefix[s.id];
  s.jiraBoardId ??= s.id === 'pricing' ? 8075 : 8000 + (hashString(s.id) % 900); // Pricing: quadro real
  s.repos ??= squadRepos[s.id] ?? [];
  s.kiro ??= true;
}
const baseIds = new Set(squads.map((s) => s.id));
const baseSnapshot = Object.fromEntries(squads.map((s) => [s.id, { ...s, repos: [...(s.repos ?? [])] }]));

function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && Array.isArray(v.custom) ? v : { custom: [], edits: {} };
  } catch {
    return { custom: [], edits: {} };
  }
}
function write(v: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

function apply(saved: Saved) {
  for (const [id, e] of Object.entries(saved.edits)) if (squadById[id]) Object.assign(squadById[id], e);
  for (const c of saved.custom) {
    if (squadById[c.id]) continue;
    const s = { ...c, custom: true };
    squads.push(s);
    squadById[s.id] = s;
  }
}
apply(read());

export const isBaseSquad = (id: string) => baseIds.has(id);

/** id a partir do nome: "Portal do Professor" → "portal-do-professor" */
export const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Cria ou atualiza um squad. Nos squads do mock, guarda só o que mudou. */
export function saveSquad(input: Squad) {
  const saved = read();
  if (baseIds.has(input.id)) {
    const base = baseSnapshot[input.id];
    const edit: Partial<Squad> = {};
    for (const k of ['name', 'techLead', 'color', 'jiraProject', 'jiraBoardId', 'repos', 'kiro', 'checkedAt'] as const) {
      if (JSON.stringify(input[k]) !== JSON.stringify(base[k])) (edit as Record<string, unknown>)[k] = input[k];
    }
    saved.edits[input.id] = edit;
    Object.assign(squadById[input.id], base, edit);
  } else {
    const s = { ...input, custom: true };
    saved.custom = [...saved.custom.filter((c) => c.id !== s.id), s];
    if (squadById[s.id]) Object.assign(squadById[s.id], s);
    else {
      squads.push(s);
      squadById[s.id] = s;
    }
  }
  write(saved);
  emit();
}

/** Remove um squad cadastrado (os do mock não podem ser removidos). */
export function removeSquad(id: string) {
  if (baseIds.has(id)) return;
  const saved = read();
  saved.custom = saved.custom.filter((c) => c.id !== id);
  write(saved);
  const i = squads.findIndex((s) => s.id === id);
  if (i >= 0) squads.splice(i, 1);
  delete squadById[id];
  emit();
}

/** Lista atual de squads; re-renderiza quando o cadastro muda. */
export function useSquads(): Squad[] {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return squads;
}
