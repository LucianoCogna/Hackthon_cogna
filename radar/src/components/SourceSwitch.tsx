import { useState } from 'react';
import { Tabs } from './ui/misc';

export type DataSource = 'mock' | 'live';

function read(key: string): DataSource {
  try {
    return localStorage.getItem(key) === 'live' ? 'live' : 'mock';
  } catch {
    return 'mock';
  }
}

/**
 * Seletor "Simulado | <dados reais>" de uma aba, lembrado por navegador.
 * Devolve a fonte atual e o elemento do seletor para colocar no cabeçalho.
 */
export function useSourceSwitch(storageKey: string, liveLabel: string) {
  const [source, setSource] = useState<DataSource>(() => read(storageKey));
  const change = (v: DataSource) => {
    setSource(v);
    try {
      localStorage.setItem(storageKey, v);
    } catch {
      /* ignore */
    }
  };
  const switcher = (
    <Tabs<DataSource>
      value={source}
      onChange={change}
      items={[
        { value: 'mock', label: 'Simulado' },
        { value: 'live', label: liveLabel },
      ]}
    />
  );
  return [source, switcher] as const;
}
