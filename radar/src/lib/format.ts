const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtInt = (n: number) => nf0.format(Math.round(n));
export const fmtDec = (n: number) => nf1.format(n);
export const fmtNum = (n: number, digits = 0) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const fmtPct = (n: number, digits = 0) => `${fmtNum(n, digits)}%`;
export const fmtBRL = (n: number) => brl.format(n);
export const fmtBRL2 = (n: number) => brl2.format(n);
export const fmtCompact = (n: number) => compact.format(n);
export const fmtCompactBRL = (n: number) => `R$ ${compact.format(n)}`;

/** Minutos → "30s", "12 min", "1h 20min" */
export function fmtDuration(min: number) {
  if (min < 1) return `${Math.max(1, Math.round(min * 60))}s`;
  if (min < 60) return `${fmtNum(min, min < 10 ? 1 : 0)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** Horas → "18h", "2,3 dias" */
export function fmtHours(h: number) {
  if (h < 48) return `${fmtNum(h, h < 10 ? 1 : 0)}h`;
  return `${fmtNum(h / 24, 1)} dias`;
}

const df = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const dfLong = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dfMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const fmtDate = (iso: string) => df.format(new Date(iso + 'T12:00:00Z')).replace('.', '');
export const fmtDateLong = (iso: string) => dfLong.format(new Date(iso + 'T12:00:00Z'));
export const fmtMonth = (iso: string) => dfMonth.format(new Date(iso + 'T12:00:00Z'));

export const fmtSigned = (n: number, digits = 0, suffix = '%') =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtNum(Math.abs(n), digits)}${suffix}`;
