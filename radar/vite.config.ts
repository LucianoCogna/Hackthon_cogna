import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Em `npm run dev`, executa as Vercel Functions de `api/` no próprio servidor do Vite,
 * com as variáveis do `.env.local`. Em produção, quem roda `api/` é a Vercel.
 */
function vercelApiInDev(): Plugin {
  return {
    name: 'radar-api-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const route = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/$/, '');
        const file = path.resolve(__dirname, 'api', `.${route}.ts`);
        // nunca serve o código de api/ como arquivo estático; rotas inexistentes ou privadas (_lib) → 404
        if (!route || route.split('/').some((p) => p.startsWith('_')) || !fs.existsSync(file)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Rota de API não encontrada' }));
        }
        try {
          const mod = await server.ssrLoadModule(file);
          await mod.default(req, res);
        } catch (e) {
          server.config.logger.error(`[api] ${route}: ${(e as Error).message}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Disponibiliza JIRA_* (e afins) para as funções de api/ no dev, sem expor ao bundle do navegador.
  Object.assign(process.env, loadEnv(mode, __dirname, ''));
  return {
    plugins: [react(), tailwindcss(), vercelApiInDev()],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  };
});
