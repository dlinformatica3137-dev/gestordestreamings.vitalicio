import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';
import { requireActiveLicense } from './customers.ts';

export const planRouter = Router();

// GET /api/plans
planRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const plans = db.getPlans(tenantId);
  return res.json({ plans });
});

// POST /api/plans
planRouter.post('/', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { name, description, app_id, category, price, billing_cycle, duration_days } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Preencha o nome e o valor do plano.' });
  }

  try {
    const plan = await db.addPlan({
      id: `plan_${Date.now()}`,
      tenant_id: tenantId,
      name,
      description: description || '',
      app_id: app_id || '',
      category: category || 'streaming',
      price: Number(price) || 0,
      billing_cycle: billing_cycle || 'mensal',
      duration_days: Number(duration_days) || 30,
      status: 'active',
      created_at: new Date().toISOString()
    });

    return res.status(201).json({ plan, message: 'Plano comercial criado com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao criar plano.' });
  }
});

// PUT /api/plans/:id
planRouter.put('/:id', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    const updated = await db.updatePlan(tenantId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }
    return res.json({ plan: updated, message: 'Plano atualizado com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao atualizar plano.' });
  }
});

// DELETE /api/plans/:id
planRouter.delete('/:id', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    await db.deletePlan(tenantId, req.params.id);
    return res.json({ message: 'Plano excluído com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
