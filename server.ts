import express from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authRouter } from './server/routes/auth.ts';
import { mpRouter } from './server/routes/mercadopago.ts';
import { customerRouter } from './server/routes/customers.ts';
import { planRouter } from './server/routes/plans.ts';
import { appRouter } from './server/routes/applications.ts';
import { financeRouter } from './server/routes/finance.ts';
import { whatsappRouter } from './server/routes/whatsapp.ts';
import { exportRouter } from './server/routes/export.ts';
import { superAdminRouter } from './server/routes/superadmin.ts';
import { startWhatsAppScheduler, runAllTenantsAutomation } from './server/whatsappScheduler.ts';
import { db } from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || (!process.env.FORCE_DEV && hasDist);

  // Iniciar sincronização e mesclagem com Firebase Firestore + nuvem em segundo plano
  db.initCloudDatabase().catch((err: any) => {
    console.warn('Aviso de sincronização inicial do banco de dados na nuvem:', err?.message);
  });

  // Request logger & health check
  app.use(compression() as any);
  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Gestor de Streamings SaaS' });
  });

  // Endpoint para Cronjob externo (cron-job.org, UptimeRobot, EasyCron)
  // Mantém o servidor Render sempre acordado (sem hibernar) e processa automações
  app.all(['/api/cron', '/api/cron/whatsapp'], async (req, res) => {
    try {
      await runAllTenantsAutomation(false);
      res.json({ status: 'ok', message: 'Cronjob executado com sucesso e servidor ativo!' });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/license', mpRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/plans', planRouter);
  app.use('/api/applications', appRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/dashboard', financeRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/superadmin', superAdminRouter);

  // Serve production dist bundle if available, otherwise live Vite middleware
  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.includes('.')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Gestor de Streamings SaaS rodando na porta ${PORT}`);
    startWhatsAppScheduler();
  });
}

process.on('uncaughtException', (err: any) => {
  console.warn('⚠️ [Server] Uncaught Exception interceptada:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('⚠️ [Server] Unhandled Rejection interceptada:', reason?.message || reason);
});

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});

