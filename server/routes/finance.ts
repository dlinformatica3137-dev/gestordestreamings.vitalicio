import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';
import { requireActiveLicense } from './customers.ts';

export const financeRouter = Router();

// GET /api/finance/charges
financeRouter.get('/charges', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const charges = db.getCharges(tenantId);
  return res.json({ charges });
});

// POST /api/finance/charges/:id/pay - Register manual payment
financeRouter.post('/charges/:id/pay', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { payment_method, discount, notes } = req.body;

  try {
    const updated = await db.registerPayment(tenantId, req.params.id, {
      payment_method: payment_method || 'Pix',
      discount: Number(discount) || 0,
      notes
    });
    return res.json({ charge: updated, message: 'Pagamento registrado com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/finance/charges/:id/cancel - Cancel charge
financeRouter.post('/charges/:id/cancel', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { reason } = req.body;

  try {
    const updated = await db.cancelCharge(tenantId, req.params.id, reason || '');
    return res.json({ charge: updated, message: 'Cobrança cancelada com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/dashboard/metrics
financeRouter.get('/metrics', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const metrics = db.getDashboardMetrics(tenantId);
  return res.json({ metrics });
});
