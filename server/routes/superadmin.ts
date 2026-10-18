import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db.ts';

export const superAdminRouter = Router();

// Middleware to verify Super Admin master token
export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers['x-super-admin-token'] as string) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : '');

  if (!token) {
    return res.status(401).json({ error: 'Acesso restrito. Forneça o token de autenticação de Super Admin.' });
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    // Valid for 7 days
    if (decoded.role !== 'super_admin' || !decoded.timestamp || (Date.now() - decoded.timestamp) > 7 * 86400000) {
      return res.status(401).json({ error: 'Sessão de Super Admin expirada. Faça login novamente.' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token de Super Admin inválido.' });
  }
}

function generateSuperAdminToken(): string {
  const payload = {
    role: 'super_admin',
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// POST /api/superadmin/login - Authenticate with Super Admin Master Password
superAdminRouter.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Informe a senha mestre de Super Administrador.' });
  }

  const isValid = db.verifySuperAdminPassword(password);
  if (!isValid) {
    return res.status(401).json({ error: 'Senha mestre incorreta. Acesso negado ao Super Admin.' });
  }

  const token = generateSuperAdminToken();
  return res.json({
    message: 'Acesso de Super Administrador concedido com sucesso.',
    token,
    role: 'super_admin'
  });
});

// GET /api/superadmin/verify - Verify session token
superAdminRouter.get('/verify', superAdminMiddleware, (req: Request, res: Response) => {
  return res.json({ valid: true, role: 'super_admin' });
});

// GET /api/superadmin/overview - Full dashboard overview of trials, purchases, and metrics
superAdminRouter.get('/overview', superAdminMiddleware, (req: Request, res: Response) => {
  try {
    const data = db.getSuperAdminOverview();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar dados do Super Admin.' });
  }
});

// POST /api/superadmin/tenants/:id/extend-trial - Extend free trial
superAdminRouter.post('/tenants/:id/extend-trial', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const hours = Number(req.body.hours) || 24;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant / Empresa não encontrada.' });
  }

  const updatedLicense = db.superAdminExtendTrial(id, hours);
  return res.json({
    message: `Período de teste prorrogado em +${hours} horas com sucesso!`,
    license: updatedLicense
  });
});

// POST /api/superadmin/tenants/:id/expire-trial - Immediately expire trial
superAdminRouter.post('/tenants/:id/expire-trial', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant / Empresa não encontrada.' });
  }

  const updatedLicense = db.superAdminExpireTrial(id);
  return res.json({
    message: 'Período de teste expirado imediatamente.',
    license: updatedLicense
  });
});

// POST /api/superadmin/tenants/:id/activate-lifetime - Grant lifetime license manually
superAdminRouter.post('/tenants/:id/activate-lifetime', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant / Empresa não encontrada.' });
  }

  const updatedLicense = db.superAdminActivateLifetime(id, notes);
  return res.json({
    message: 'Licença vitalícia ativada com sucesso para o usuário!',
    license: updatedLicense
  });
});

// POST /api/superadmin/tenants/:id/revoke-lifetime - Revoke lifetime license
superAdminRouter.post('/tenants/:id/revoke-lifetime', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant / Empresa não encontrada.' });
  }

  const updatedLicense = db.superAdminRevokeLifetime(id);
  return res.json({
    message: 'Licença vitalícia revogada e retornada para expirada.',
    license: updatedLicense
  });
});

// POST /api/superadmin/tenants/:id/reset-password - Reset user password
superAdminRouter.post('/tenants/:id/reset-password', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_password, user_id } = req.body;

  let targetUserId = user_id;
  if (!targetUserId) {
    const profile = db.findUserById(id) || (db as any).data.profiles.find((p: any) => p.tenant_id === id);
    if (profile) targetUserId = profile.id;
  }

  if (!targetUserId) {
    return res.status(404).json({ error: 'Usuário do tenant não localizado.' });
  }

  const result = db.superAdminResetUserPassword(targetUserId, new_password);
  if (!result) {
    return res.status(404).json({ error: 'Erro ao redefinir senha do usuário.' });
  }

  return res.json({
    message: 'Senha redefinida com sucesso!',
    new_password: result.generatedPass
  });
});

// DELETE /api/superadmin/tenants/:id - Delete tenant and all associated data
superAdminRouter.delete('/tenants/:id', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const tenant = db.findTenantById(id);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant não encontrado.' });
  }

  db.superAdminDeleteTenant(id);
  return res.json({ message: 'Conta do tenant e todos os dados associados foram removidos com sucesso.' });
});

// POST /api/superadmin/transactions/:id/approve - Approve checkout transaction manually
superAdminRouter.post('/transactions/:id/approve', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const tx = db.superAdminApproveTransaction(id);
  if (!tx) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  return res.json({
    message: 'Transação aprovada com sucesso! Licença vitalícia liberada.',
    transaction: tx
  });
});

// POST /api/superadmin/transactions/:id/cancel - Cancel transaction
superAdminRouter.post('/transactions/:id/cancel', superAdminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;

  const tx = db.superAdminCancelTransaction(id);
  if (!tx) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  return res.json({
    message: 'Transação marcada como cancelada.',
    transaction: tx
  });
});

// PUT /api/superadmin/settings - Update SaaS global configuration
superAdminRouter.put('/settings', superAdminMiddleware, (req: Request, res: Response) => {
  const { lifetime_price, trial_duration_hours, mp_access_token, mp_webhook_secret } = req.body;

  const updated = db.updateSystemSettings({
    lifetime_price,
    trial_duration_hours,
    mp_access_token,
    mp_webhook_secret
  });

  return res.json({
    message: 'Configurações do SaaS atualizadas com sucesso.',
    settings: {
      lifetime_price: updated.lifetime_price,
      trial_duration_hours: updated.trial_duration_hours,
      has_mp_token: Boolean(updated.mp_access_token),
      mp_access_token: updated.mp_access_token || ''
    }
  });
});

// PUT /api/superadmin/change-password - Change master super admin password
superAdminRouter.put('/change-password', superAdminMiddleware, (req: Request, res: Response) => {
  const { current_password, new_password, confirm_new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
  }

  if (new_password !== confirm_new_password) {
    return res.status(400).json({ error: 'As confirmações de senha não coincidem.' });
  }

  const isCurrentValid = db.verifySuperAdminPassword(current_password);
  if (!isCurrentValid) {
    return res.status(401).json({ error: 'Senha mestre atual incorreta.' });
  }

  db.changeSuperAdminPassword(new_password);
  return res.json({ message: 'Senha mestre de Super Administrador alterada com sucesso!' });
});
