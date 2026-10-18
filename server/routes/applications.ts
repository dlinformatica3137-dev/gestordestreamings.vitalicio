import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';
import { requireActiveLicense } from './customers.ts';

export const appRouter = Router();

// GET /api/applications
appRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const applications = db.getApplications(tenantId);
  return res.json({ applications });
});

// POST /api/applications
appRouter.post('/', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { name, category, description, color, devices, login_type, requires_own_license, download_url, setup_notes } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Nome e categoria são obrigatórios.' });
  }

  try {
    const newApp = await db.addApplication({
      id: `app_${Date.now()}`,
      tenant_id: tenantId,
      name,
      category,
      description: description || '',
      color: color || '#2563EB',
      devices: Array.isArray(devices) ? devices : [],
      login_type: login_type || 'xtream',
      requires_own_license: Boolean(requires_own_license),
      download_url: download_url || '',
      setup_notes: setup_notes || '',
      status: 'active',
      created_at: new Date().toISOString()
    });

    return res.status(201).json({ application: newApp, message: 'Aplicativo cadastrado com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao cadastrar aplicativo.' });
  }
});

// PUT /api/applications/:id
appRouter.put('/:id', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    const updated = await db.updateApplication(tenantId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Aplicativo não encontrado.' });
    }
    return res.json({ application: updated, message: 'Aplicativo atualizado com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao atualizar aplicativo.' });
  }
});

// DELETE /api/applications/:id
appRouter.delete('/:id', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    await db.deleteApplication(tenantId, req.params.id);
    return res.json({ message: 'Aplicativo excluído com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
