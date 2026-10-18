import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from './auth.ts';

export const customerRouter = Router();

// Middleware to check if license is active (not expired trial)
export function requireActiveLicense(req: AuthenticatedRequest, res: Response, next: any) {
  const license = db.getLicense(req.tenantId!);
  if (license.is_expired && license.type !== 'lifetime') {
    return res.status(403).json({
      error: 'Seu período de teste de 3 dias encerrou. Adquira a licença vitalícia por R$ 199,00 para continuar gerenciando seus clientes e automações.',
      is_license_expired: true
    });
  }
  next();
}

// GET /api/customers
customerRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const customers = db.getCustomers(tenantId);
  return res.json({ customers });
});

// GET /api/customers/:id
customerRouter.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const customer = db.getCustomerById(tenantId, req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }
  return res.json({ customer });
});

// POST /api/customers
customerRouter.post('/', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { full_name, phone, whatsapp, email, cpf, app_id, plan_id, monthly_fee, start_date, due_date, payment_method, notes, mac_address, device_key, app_username, app_password } = req.body;

  if (!full_name || !app_id || !plan_id || !due_date) {
    return res.status(400).json({ error: 'Campos obrigatórios: Nome completo, Aplicativo, Plano e Vencimento.' });
  }

  const resolvedPhone = phone || whatsapp || '';
  const resolvedWhatsapp = whatsapp || phone || '';

  try {
    const customer = await db.addCustomer(tenantId, {
      full_name,
      phone: resolvedPhone,
      whatsapp: resolvedWhatsapp,
      email: email || '',
      cpf: cpf || '',
      app_id,
      plan_id,
      monthly_fee: Number(monthly_fee) || 0,
      start_date: start_date || new Date().toISOString().split('T')[0],
      due_date,
      payment_method: payment_method || 'Pix',
      status: 'active',
      notes: notes || '',
      mac_address: mac_address || '',
      device_key: device_key || '',
      app_username: app_username || '',
      app_password: app_password || ''
    });

    return res.status(201).json({ customer, message: 'Cliente cadastrado com sucesso!' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao cadastrar cliente.' });
  }
});

// PUT /api/customers/:id
customerRouter.put('/:id', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    const updated = await db.updateCustomer(tenantId, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    return res.json({ customer: updated, message: 'Dados do cliente atualizados com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao atualizar cliente.' });
  }
});

// DELETE /api/customers/:id
customerRouter.delete('/:id', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  try {
    await db.deleteCustomer(tenantId, req.params.id);
    return res.json({ message: 'Cliente e cobranças associadas excluídos com sucesso.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/customers/:id/renew
customerRouter.post('/:id/renew', authMiddleware, requireActiveLicense, async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.tenantId!;
  const { payment_method, discount } = req.body;

  try {
    const result = await db.renewCustomerSubscription(tenantId, req.params.id, payment_method || 'Pix', Number(discount) || 0);
    return res.json({ ...result, message: 'Assinatura renovada com sucesso! Vencimento estendido e pagamento registrado.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
