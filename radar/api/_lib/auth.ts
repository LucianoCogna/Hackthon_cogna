// Código de acesso do RADAR: protege os dados reais (Jira, GitHub) das rotas /api.
// O navegador envia o código no cabeçalho "x-radar-access"; o servidor compara com RADAR_ACCESS_CODE.
import { timingSafeEqual } from 'node:crypto';
import { JiraError, type Req } from './jira.js';

export const ACCESS_HEADER = 'x-radar-access';

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Lança 401 (code: 'auth') se o código não confere.
 * Sem RADAR_ACCESS_CODE configurado: libera só fora da Vercel (dev local); na Vercel, nega (falha fechada).
 */
export function requireAccess(req: Req) {
  const expected = process.env.RADAR_ACCESS_CODE;
  if (!expected) {
    if (process.env.VERCEL) throw new JiraError('Acesso restrito: RADAR_ACCESS_CODE não configurado no servidor.', 401, 'auth');
    return;
  }
  const sent = req.headers[ACCESS_HEADER];
  const value = Array.isArray(sent) ? sent[0] : sent;
  if (!value || !safeEqual(value.trim(), expected)) {
    throw new JiraError(value ? 'Código de acesso inválido.' : 'Dados reais restritos: informe o código de acesso.', 401, 'auth');
  }
}
