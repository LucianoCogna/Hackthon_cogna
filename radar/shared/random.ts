// PRNG determinístico (mulberry32): os PRs simulados são sempre os mesmos para os mesmos dados do Jira.
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string | number) {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (mean = 0, sd = 1) => {
    const u = Math.max(next(), 1e-9);
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  return {
    next,
    float: (min = 0, max = 1) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    bool: (p = 0.5) => next() < p,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    normal,
    /** log-normal parametrizada pela média desejada */
    lognormalMean: (mean: number, sigma: number) => Math.exp(Math.log(mean) - (sigma * sigma) / 2 + sigma * normal()),
  };
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
